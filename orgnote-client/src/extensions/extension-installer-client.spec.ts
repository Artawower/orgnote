import { expect, test, vi } from 'vitest';
import type { OrgNoteWorkerHandle, WorkerStore } from 'orgnote-api';
import {
  EXTENSION_INSTALLER_WORKER_ID,
  type ExtensionInstallerWorkerContract,
} from './extension-installer-contract';
import { fetchExtensionPackageInWorker } from './extension-installer-client';

const request = {
  source: {
    type: 'git' as const,
    repo: 'https://example.com/extension',
  },
};

const createWorkers = (
  call: OrgNoteWorkerHandle<ExtensionInstallerWorkerContract>['call'],
) => {
  const dispose = vi.fn();
  const handle = { call, on: vi.fn(), dispose };
  const spawn = vi.fn(async () => handle);
  return {
    dispose,
    spawn,
    workers: { spawn } as unknown as WorkerStore,
  };
};

test('installer client invokes the registered package worker', async () => {
  const extensionPackage = { rawContent: 'export default {};', assets: [] };
  const call = vi.fn(async () => extensionPackage) as unknown as
    OrgNoteWorkerHandle<ExtensionInstallerWorkerContract>['call'];
  const { dispose, spawn, workers } = createWorkers(call);

  await expect(fetchExtensionPackageInWorker(workers, request)).resolves.toEqual(
    extensionPackage,
  );
  expect(spawn).toHaveBeenCalledWith(EXTENSION_INSTALLER_WORKER_ID);
  expect(call).toHaveBeenCalledWith('fetchPackage', request);
  expect(dispose).toHaveBeenCalledOnce();
});

test('installer client disposes its worker after failure', async () => {
  const call = vi.fn(async () => {
    throw new TypeError('fetch failed');
  }) as unknown as OrgNoteWorkerHandle<ExtensionInstallerWorkerContract>['call'];
  const { dispose, workers } = createWorkers(call);

  await expect(fetchExtensionPackageInWorker(workers, request)).rejects.toThrow(
    'fetch failed',
  );
  expect(dispose).toHaveBeenCalledOnce();
});
