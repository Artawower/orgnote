import type {
  OrgNoteCoreApi,
  OrgNoteWorkerContract,
  OrgNoteWorkerHandle,
  WorkerCallOptions,
  WorkerEventName,
  WorkerInput,
  WorkerMethodName,
  WorkerOutput,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { dispatchCoreRpc, dispatchWorkerLog } from './core-rpc';
import type { HostWorkerEndpoint } from './worker-endpoint';
import {
  WorkerCallAbortedError,
  WorkerCrashedError,
  WorkerDisposedError,
  WorkerProtocolError,
  WorkerRemoteError,
} from './worker-errors';
import { createWorkerEventListeners } from './worker-event-listeners';
import { createPendingWorkerCalls } from './worker-pending-calls';
import { collectBinaryTransferables } from './worker-transfer';
import {
  isWorkerToHostMessage,
  serializeWorkerError,
  WORKER_MESSAGE_TYPE,
  type WorkerCoreCall,
  type WorkerToHostMessage,
} from './worker-protocol';

class HostWorkerRuntime<TContract extends OrgNoteWorkerContract> {
  private readonly pending = createPendingWorkerCalls();
  private readonly events = createWorkerEventListeners((event, error) => {
    this.coreApi.logger.error('Worker event listener failed', { event, error: String(error) });
  });
  private requestSequence = 0;
  private isDisposed = false;

  constructor(
    private readonly worker: HostWorkerEndpoint,
    private readonly coreApi: OrgNoteCoreApi,
  ) {
    worker.addEventListener('message', this.handleMessage);
    worker.addEventListener('error', this.handleError);
  }

  toHandle(): OrgNoteWorkerHandle<TContract> {
    return {
      call: (method, input, options) => this.call(method, input, options),
      on: (event, listener) => this.on(event, listener),
      dispose: () => this.shutdown(new WorkerDisposedError()),
    };
  }

  private call<TMethod extends WorkerMethodName<TContract>>(
    method: TMethod,
    input: WorkerInput<TContract, TMethod>,
    options?: WorkerCallOptions,
  ): Promise<WorkerOutput<TContract, TMethod>> {
    if (this.isDisposed) return Promise.reject(new WorkerDisposedError());
    if (options?.signal?.aborted) return Promise.reject(new WorkerCallAbortedError());
    const requestId = `call:${++this.requestSequence}`;
    return new Promise((resolve, reject) => {
      this.pending.register(requestId, {
        resolve: (value) => resolve(value as WorkerOutput<TContract, TMethod>),
        reject,
        cleanup: this.createAbortCleanup(requestId, options, reject),
      });
      this.worker.postMessage(
        { type: WORKER_MESSAGE_TYPE.CALL, requestId, method, input },
        options?.transfer ? [...options.transfer] : [],
      );
    });
  }

  private on<TEvent extends WorkerEventName<TContract>>(
    event: TEvent,
    listener: (payload: TContract['events'][TEvent]) => void,
  ): () => void {
    if (this.isDisposed) throw new WorkerDisposedError();
    return this.events.subscribe(event, listener as (payload: unknown) => void);
  }

  private readonly handleMessage = (event: MessageEvent<WorkerToHostMessage>): void => {
    if (isWorkerToHostMessage(event.data)) {
      this.dispatchMessage(event.data);
      return;
    }
    this.shutdown(new WorkerProtocolError('Worker sent an invalid message'));
  };

  private readonly handleError = (event: ErrorEvent): void => {
    this.shutdown(new WorkerCrashedError(event.message));
  };

  private dispatchMessage(message: WorkerToHostMessage): void {
    if (message.type === WORKER_MESSAGE_TYPE.RESULT) {
      this.settle(message.requestId, message.value);
      return;
    }
    if (message.type === WORKER_MESSAGE_TYPE.FAILURE) {
      this.settle(message.requestId, undefined, new WorkerRemoteError(message.error));
      return;
    }
    if (message.type === WORKER_MESSAGE_TYPE.EVENT) {
      this.events.emit(message.event, message.payload);
      return;
    }
    if (message.type === WORKER_MESSAGE_TYPE.LOG) {
      dispatchWorkerLog(this.coreApi, message);
      return;
    }
    void this.handleCoreCall(message);
  }

  private settle(requestId: string, value: unknown, error?: Error): void {
    const call = this.pending.take(requestId);
    if (!call) return;
    call.cleanup();
    if (error) {
      call.reject(error);
      return;
    }
    call.resolve(value);
  }

  private async handleCoreCall(message: WorkerCoreCall): Promise<void> {
    const result = await to(() => dispatchCoreRpc(this.coreApi, message))();
    if (this.isDisposed) return;
    if (result.isErr()) {
      this.worker.postMessage({
        type: WORKER_MESSAGE_TYPE.CORE_FAILURE,
        requestId: message.requestId,
        error: serializeWorkerError(result.error),
      });
      return;
    }
    this.worker.postMessage(
      { type: WORKER_MESSAGE_TYPE.CORE_RESULT, requestId: message.requestId, value: result.value },
      collectBinaryTransferables(result.value),
    );
  }

  private createAbortCleanup(
    requestId: string,
    options: WorkerCallOptions | undefined,
    reject: (error: Error) => void,
  ): () => void {
    const signal = options?.signal;
    if (!signal) return () => undefined;
    const abort = (): void => {
      const call = this.pending.take(requestId);
      if (!call) return;
      call.cleanup();
      this.worker.postMessage({ type: WORKER_MESSAGE_TYPE.CANCEL, requestId });
      reject(new WorkerCallAbortedError());
    };
    signal.addEventListener('abort', abort, { once: true });
    return () => signal.removeEventListener('abort', abort);
  }

  private shutdown(error: Error): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleError);
    this.pending.rejectAll(error);
    this.events.clear();
    this.worker.terminate();
  }
}

export const createWorkerHandle = <TContract extends OrgNoteWorkerContract>(
  worker: HostWorkerEndpoint,
  coreApi: OrgNoteCoreApi,
): OrgNoteWorkerHandle<TContract> => new HostWorkerRuntime<TContract>(worker, coreApi).toHandle();
