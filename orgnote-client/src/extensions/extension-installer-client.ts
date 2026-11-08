import type { WorkerStore } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import {
  isHostWorkerRegistered,
  registerHostWorker,
} from 'src/workers/worker-registry';
import {
  EXTENSION_INSTALLER_WORKER_ID,
  type ExtensionInstallerRequest,
  type ExtensionInstallerWorkerContract,
  type FetchedExtensionPackage,
} from './extension-installer-contract';

export const registerExtensionInstallerWorker = (): void => {
  if (isHostWorkerRegistered(EXTENSION_INSTALLER_WORKER_ID)) return;
  registerHostWorker(EXTENSION_INSTALLER_WORKER_ID, (options) =>
    new Worker(new URL('./extension-installer.worker.ts', import.meta.url), {
      type: 'module',
      name: options?.name ?? EXTENSION_INSTALLER_WORKER_ID,
    }),
  );
};

export const fetchExtensionPackageInWorker = async (
  workers: WorkerStore,
  request: ExtensionInstallerRequest,
): Promise<FetchedExtensionPackage> => {
  const handle = await workers.spawn<ExtensionInstallerWorkerContract>(
    EXTENSION_INSTALLER_WORKER_ID,
  );
  const fetchResult = await to(() => handle.call('fetchPackage', request))();
  handle.dispose();
  if (fetchResult.isErr()) throw fetchResult.error;
  return fetchResult.value;
};
