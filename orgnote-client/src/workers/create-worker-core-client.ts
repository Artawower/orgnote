import type {
  OrgNoteCoreApi,
  OrgNoteFileEncoding,
  OrgNoteFilePath,
  OrgNoteLogFields,
} from 'orgnote-api';
import {
  CORE_RPC_OPERATION,
  type CoreRpcRequest,
} from './core-rpc-contract';
import type { WorkerRuntimeEndpoint } from './worker-endpoint';
import { WorkerProtocolError, WorkerRemoteError } from './worker-errors';
import { collectBinaryTransferables } from './worker-transfer';
import {
  WORKER_MESSAGE_TYPE,
  type WorkerCoreFailure,
  type WorkerCoreResult,
} from './worker-protocol';

interface PendingCoreCall {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
}

export interface WorkerCoreClient {
  readonly api: OrgNoteCoreApi;
  settle(message: WorkerCoreResult | WorkerCoreFailure): void;
  dispose(): void;
}

export const createWorkerCoreClient = (
  endpoint: WorkerRuntimeEndpoint,
): WorkerCoreClient => {
  const pending = new Map<string, PendingCoreCall>();
  let requestSequence = 0;

  const call = <TOutput>(
    request: CoreRpcRequest,
    transfer: Transferable[] = [],
  ): Promise<TOutput> => {
    const requestId = `core:${++requestSequence}`;
    return new Promise((resolve, reject) => {
      pending.set(requestId, {
        resolve: (value) => resolve(value as TOutput),
        reject,
      });
      endpoint.postMessage({
        type: WORKER_MESSAGE_TYPE.CORE_CALL,
        requestId,
        ...request,
      }, transfer);
    });
  };

  const readFile = async <TEncoding extends OrgNoteFileEncoding = 'utf8'>(
    path: OrgNoteFilePath,
    encoding?: TEncoding,
  ): Promise<(TEncoding extends 'utf8' ? string : Uint8Array) | undefined> =>
    await call({
      operation: CORE_RPC_OPERATION.READ_FILE,
      input: { path, encoding },
    });

  const log = (
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
    fields?: OrgNoteLogFields,
  ): void => {
    endpoint.postMessage({ type: WORKER_MESSAGE_TYPE.LOG, level, message, fields });
  };

  const api: OrgNoteCoreApi = {
    files: {
      readFile,
      writeFile: async (path, content) => await call({
        operation: CORE_RPC_OPERATION.WRITE_FILE,
        input: { path, content },
      }, collectBinaryTransferables(content)),
      readDir: async (path) => await call({
        operation: CORE_RPC_OPERATION.READ_DIR,
        input: { path },
      }),
      fileInfo: async (path) => await call({
        operation: CORE_RPC_OPERATION.FILE_INFO,
        input: { path },
      }),
    },
    logger: {
      info: (message, fields) => log('info', message, fields),
      error: (message, fields) => log('error', message, fields),
      warn: (message, fields) => log('warn', message, fields),
      debug: (message, fields) => log('debug', message, fields),
    },
  };

  const settle = (message: WorkerCoreResult | WorkerCoreFailure): void => {
    const pendingCall = pending.get(message.requestId);
    if (!pendingCall) return;
    pending.delete(message.requestId);
    if (message.type === WORKER_MESSAGE_TYPE.CORE_FAILURE) {
      pendingCall.reject(new WorkerRemoteError(message.error));
      return;
    }
    pendingCall.resolve(message.value);
  };

  const dispose = (): void => {
    const error = new WorkerProtocolError('Worker runtime has been disposed');
    pending.forEach(({ reject }) => reject(error));
    pending.clear();
  };

  return { api, settle, dispose };
};
