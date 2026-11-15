import type {
  ExtensionManifest,
  ExtensionWorkerDescriptor,
  OrgNoteCoreApi,
} from 'orgnote-api';
import type { ExtensionRuntimeFiles } from 'src/composables/use-extension-runtime-files';
import { useExtensionRuntimeFiles } from 'src/composables/use-extension-runtime-files';
import type { HostWorkerEndpoint } from 'src/workers/worker-endpoint';
import { WorkerAlreadyRegisteredError } from 'src/workers/worker-errors';
import { orgNoteCoreApi } from 'src/api/orgnote-core-api';
import { createExtensionWorker } from './workers/create-extension-worker';
import { restrictCoreApi } from './workers/restrict-core-api';
import {
  isHostWorkerRegistered,
  registerHostWorker,
  type HostWorkerFactory,
} from 'src/workers/worker-registry';

export class ExtensionWorkerAssetNotFoundError extends Error {
  override readonly name = 'ExtensionWorkerAssetNotFoundError';

  constructor(path: string) {
    super(`Extension worker asset is not available: ${path}`);
  }
}

interface ExtensionWorkerDependencies {
  readonly coreApi: OrgNoteCoreApi;
  readonly runtimeFiles: ExtensionRuntimeFiles;
  readonly createWorker: (
    content: Uint8Array,
    name: string,
  ) => Promise<HostWorkerEndpoint>;
}

const createDefaultDependencies = (): ExtensionWorkerDependencies => ({
  coreApi: orgNoteCoreApi,
  runtimeFiles: useExtensionRuntimeFiles(),
  createWorker: createExtensionWorker,
});

const createWorkerFactory = (
  manifest: ExtensionManifest,
  descriptor: ExtensionWorkerDescriptor,
  dependencies: ExtensionWorkerDependencies,
): HostWorkerFactory => async (options) => {
  const content = await dependencies.runtimeFiles.readAsset(manifest, descriptor.path);
  if (!content) throw new ExtensionWorkerAssetNotFoundError(descriptor.path);
  return await dependencies.createWorker(content, options?.name ?? descriptor.id);
};

const findUnavailableWorker = (
  workers: readonly ExtensionWorkerDescriptor[],
): ExtensionWorkerDescriptor | undefined => {
  const ids = new Set<string>();
  return workers.find((worker) => {
    if (ids.has(worker.id) || isHostWorkerRegistered(worker.id)) return true;
    ids.add(worker.id);
    return false;
  });
};

export const registerExtensionWorkers = (
  manifest: ExtensionManifest,
  dependencies: ExtensionWorkerDependencies = createDefaultDependencies(),
): (() => void) => {
  const workers = manifest.workers ?? [];
  const unavailable = findUnavailableWorker(workers);
  if (unavailable) throw new WorkerAlreadyRegisteredError(unavailable.id);
  const releases = workers.map((worker) =>
    registerHostWorker(
      worker.id,
      createWorkerFactory(manifest, worker, dependencies),
      {
        coreApi: restrictCoreApi(
          dependencies.coreApi,
          worker.id,
          worker.capabilities ?? [],
        ),
      },
    ),
  );
  return () => releases.forEach((release) => release());
};
