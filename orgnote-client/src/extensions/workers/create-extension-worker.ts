import { to } from 'orgnote-api/utils';
import type { HostWorkerEndpoint } from 'src/workers/worker-endpoint';
import { WorkerCrashedError, WorkerRemoteError } from 'src/workers/worker-errors';
import {
  EXTENSION_WORKER_MESSAGE_TYPE,
  isExtensionWorkerInitResult,
  type ExtensionWorkerInitRequest,
} from './extension-worker-loader-protocol';

const WORKER_INITIALIZATION_TIMEOUT_MS = 15_000;

export class ExtensionWorkerInitializationError extends Error {
  override readonly name = 'ExtensionWorkerInitializationError';

  constructor() {
    super('Extension worker initialization timed out');
  }
}

const createLoaderWorker = (name: string): Worker =>
  new Worker(new URL('./extension-worker-loader.ts', import.meta.url), {
    type: 'module',
    name,
  });

const waitForWorkerInitialization = (
  worker: Worker,
): Promise<HostWorkerEndpoint> => new Promise((resolve, reject) => {
  const cleanup = (): void => {
    clearTimeout(timeout);
    worker.removeEventListener('message', handleMessage);
    worker.removeEventListener('error', handleError);
  };
  const fail = (error: Error): void => {
    cleanup();
    worker.terminate();
    reject(error);
  };
  const handleMessage = (event: MessageEvent<unknown>): void => {
    if (!isExtensionWorkerInitResult(event.data)) return;
    if (event.data.type === EXTENSION_WORKER_MESSAGE_TYPE.INIT_FAILURE) {
      fail(new WorkerRemoteError(event.data.error));
      return;
    }
    cleanup();
    resolve(worker);
  };
  const handleError = (event: ErrorEvent): void => fail(new WorkerCrashedError(event.message));
  const timeout = setTimeout(
    () => fail(new ExtensionWorkerInitializationError()),
    WORKER_INITIALIZATION_TIMEOUT_MS,
  );
  worker.addEventListener('message', handleMessage);
  worker.addEventListener('error', handleError);
});

export const createExtensionWorker = async (
  content: Uint8Array,
  name: string,
): Promise<HostWorkerEndpoint> => {
  const moduleUrl = URL.createObjectURL(new Blob([content], { type: 'text/javascript' }));
  const worker = createLoaderWorker(name);
  const request: ExtensionWorkerInitRequest = {
    type: EXTENSION_WORKER_MESSAGE_TYPE.INIT,
    moduleUrl,
  };
  const initialized = await to(async () => {
    const initialization = waitForWorkerInitialization(worker);
    worker.postMessage(request);
    return await initialization;
  })();
  URL.revokeObjectURL(moduleUrl);
  if (initialized.isErr()) {
    worker.terminate();
    throw initialized.error;
  }
  return initialized.value;
};
