import type {
  OrgNoteWorkerContract,
  OrgNoteWorkerDefinition,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { getWorkerRuntimeEndpoint } from 'src/workers/worker-endpoint';
import { WorkerProtocolError } from 'src/workers/worker-errors';
import { isRecord } from 'src/workers/protocol-validation';
import { attachWorkerRuntime } from 'src/workers/start-worker-runtime';
import { serializeWorkerError } from 'src/workers/worker-protocol';
import {
  EXTENSION_WORKER_MESSAGE_TYPE,
  getExtensionWorkerInitEndpoint,
  isExtensionWorkerInitRequest,
  type ExtensionWorkerInitRequest,
} from './extension-worker-loader-protocol';

interface ExtensionWorkerModule {
  readonly default: OrgNoteWorkerDefinition<OrgNoteWorkerContract>;
}

const scope = getWorkerRuntimeEndpoint();
const initEndpoint = getExtensionWorkerInitEndpoint();

const isWorkerDefinition = (
  value: unknown,
): value is OrgNoteWorkerDefinition<OrgNoteWorkerContract> =>
  isRecord(value) && isRecord(value.methods);

const loadWorkerDefinition = async (moduleUrl: string): Promise<ExtensionWorkerModule> => {
  const loaded: unknown = await import(/* @vite-ignore */ moduleUrl);
  if (!isRecord(loaded) || !isWorkerDefinition(loaded.default)) {
    throw new WorkerProtocolError('Extension worker must export a worker definition as default');
  }
  return { default: loaded.default };
};

const initializeWorker = async (request: ExtensionWorkerInitRequest): Promise<void> => {
  const loaded = await to(loadWorkerDefinition)(request.moduleUrl);
  if (loaded.isErr()) {
    initEndpoint.postMessage({
      type: EXTENSION_WORKER_MESSAGE_TYPE.INIT_FAILURE,
      error: serializeWorkerError(loaded.error),
    });
    return;
  }
  attachWorkerRuntime(loaded.value.default, scope);
  initEndpoint.postMessage({ type: EXTENSION_WORKER_MESSAGE_TYPE.READY });
};

const handleInit = (event: MessageEvent<unknown>): void => {
  if (!isExtensionWorkerInitRequest(event.data)) return;
  scope.removeEventListener('message', handleInit);
  void initializeWorker(event.data);
};

scope.addEventListener('message', handleInit);
