import type {
  OrgNoteWorkerContract,
  OrgNoteWorkerDefinition,
  WorkerEventName,
  WorkerMethodContext,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { createWorkerCoreClient, type WorkerCoreClient } from './create-worker-core-client';
import {
  getWorkerRuntimeEndpoint,
  type WorkerRuntimeEndpoint,
} from './worker-endpoint';
import { WorkerProtocolError } from './worker-errors';
import { collectBinaryTransferables } from './worker-transfer';
import {
  isHostToWorkerMessage,
  serializeWorkerError,
  WORKER_MESSAGE_TYPE,
  type HostToWorkerMessage,
  type WorkerCallRequest,
} from './worker-protocol';

type WorkerHandler = (
  input: unknown,
  context: WorkerMethodContext<OrgNoteWorkerContract>,
) => unknown | Promise<unknown>;

const findHandler = <TContract extends OrgNoteWorkerContract>(
  definition: OrgNoteWorkerDefinition<TContract>,
  method: string,
): WorkerHandler | undefined =>
  (definition.methods as Record<string, WorkerHandler>)[method];

class WorkerExecutionRuntime<TContract extends OrgNoteWorkerContract> {
  private readonly controllers = new Map<string, AbortController>();
  private readonly coreClient: WorkerCoreClient;
  private isDisposed = false;

  constructor(
    private readonly definition: OrgNoteWorkerDefinition<TContract>,
    private readonly endpoint: WorkerRuntimeEndpoint,
  ) {
    this.coreClient = createWorkerCoreClient(endpoint);
    endpoint.addEventListener('message', this.handleMessage);
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.endpoint.removeEventListener('message', this.handleMessage);
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
    this.coreClient.dispose();
  }

  private readonly handleMessage = (event: MessageEvent<HostToWorkerMessage>): void => {
    if (!isHostToWorkerMessage(event.data)) {
      this.dispose();
      return;
    }
    const message = event.data;
    if (message.type === WORKER_MESSAGE_TYPE.CALL) {
      void this.runCall(message);
      return;
    }
    if (message.type === WORKER_MESSAGE_TYPE.CANCEL) {
      this.controllers.get(message.requestId)?.abort();
      return;
    }
    this.coreClient.settle(message);
  };

  private async runCall(message: WorkerCallRequest): Promise<void> {
    const handler = findHandler(this.definition, message.method);
    if (!handler) {
      this.postFailure(
        message.requestId,
        new WorkerProtocolError(`Worker method is not available: ${message.method}`),
      );
      return;
    }
    const controller = new AbortController();
    this.controllers.set(message.requestId, controller);
    const result = await to(() =>
      Promise.resolve(handler(message.input, this.createContext(controller.signal))),
    )();
    if (!this.finishCall(message.requestId)) return;
    if (result.isErr()) {
      this.postFailure(message.requestId, result.error);
      return;
    }
    this.endpoint.postMessage(
      { type: WORKER_MESSAGE_TYPE.RESULT, requestId: message.requestId, value: result.value },
      collectBinaryTransferables(result.value),
    );
  }

  private createContext(signal: AbortSignal): WorkerMethodContext<TContract> {
    return {
      api: this.coreClient.api,
      signal,
      emit: (event, payload) => this.emit(event, payload),
    };
  }

  private finishCall(requestId: string): boolean {
    const controller = this.controllers.get(requestId);
    this.controllers.delete(requestId);
    return Boolean(controller && !controller.signal.aborted);
  }

  private postFailure(requestId: string, error: unknown): void {
    this.endpoint.postMessage({
      type: WORKER_MESSAGE_TYPE.FAILURE,
      requestId,
      error: serializeWorkerError(error),
    });
  }

  private emit<TEvent extends WorkerEventName<TContract>>(
    event: TEvent,
    payload: TContract['events'][TEvent],
  ): void {
    this.endpoint.postMessage(
      { type: WORKER_MESSAGE_TYPE.EVENT, event, payload },
      collectBinaryTransferables(payload),
    );
  }
}

export const attachWorkerRuntime = <TContract extends OrgNoteWorkerContract>(
  definition: OrgNoteWorkerDefinition<TContract>,
  endpoint: WorkerRuntimeEndpoint,
): (() => void) => {
  const runtime = new WorkerExecutionRuntime(definition, endpoint);
  return () => runtime.dispose();
};

export const startWorkerRuntime = <TContract extends OrgNoteWorkerContract>(
  definition: OrgNoteWorkerDefinition<TContract>,
): void => {
  attachWorkerRuntime(definition, getWorkerRuntimeEndpoint());
};
