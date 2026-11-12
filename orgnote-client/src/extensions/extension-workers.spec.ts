import { afterEach, expect, test, vi } from 'vitest';
import type {
  ExtensionManifest,
  OrgNoteCoreApi,
  OrgNoteFileEncoding,
  OrgNoteWorkerContract,
  OrgNoteWorkerDefinition,
  WorkerProcedure,
} from 'orgnote-api';
import type { ExtensionRuntimeFiles } from 'src/composables/use-extension-runtime-files';
import { useWorkerStore } from 'src/stores/worker';
import { attachWorkerRuntime } from 'src/workers/start-worker-runtime';
import { createWorkerTestChannel } from '../../test/worker-test-channel';
import { registerExtensionWorkers } from './extension-workers';

interface ExtensionTestWorkerContract extends OrgNoteWorkerContract {
  methods: {
    read: WorkerProcedure<string, string | undefined>;
    write: WorkerProcedure<{ path: string; content: string }, void>;
  };
  events: Record<string, never>;
}

const WORKER_CONTENT = new TextEncoder().encode('export default {};');
const WORKER_ASSET = {
  path: 'workers/indexer.js',
  mediaType: 'text/javascript',
  size: WORKER_CONTENT.byteLength,
  integrity: `sha256-${'a'.repeat(43)}=`,
};

const manifest: ExtensionManifest = {
  name: 'worker-extension',
  version: '1.0.0',
  category: 'extension',
  source: { type: 'git', repo: 'https://example.com/worker-extension' },
  assets: [WORKER_ASSET],
  workers: [
    {
      id: 'worker-extension.indexer',
      path: WORKER_ASSET.path,
      capabilities: ['files:read'],
    },
  ],
};

const definition: OrgNoteWorkerDefinition<ExtensionTestWorkerContract> = {
  methods: {
    read: async (path, context) => await context.api.files.readFile(path),
    write: async ({ path, content }, context) =>
      await context.api.files.writeFile(path, content),
  },
};

const coreReadFile = vi.fn(async () => 'content');
const coreWriteFile = vi.fn(async () => undefined);

const coreApi: OrgNoteCoreApi = {
  files: {
    readFile: async <TEncoding extends OrgNoteFileEncoding = 'utf8'>() =>
      await coreReadFile() as
        (TEncoding extends 'utf8' ? string : Uint8Array) | undefined,
    writeFile: coreWriteFile,
    readDir: vi.fn(async () => []),
    fileInfo: vi.fn(async () => undefined),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
};

const createRuntimeFiles = (): ExtensionRuntimeFiles => ({
  write: vi.fn(async () => undefined),
  readEntry: vi.fn(async () => undefined),
  readAsset: vi.fn(async () => WORKER_CONTENT),
  remove: vi.fn(async () => undefined),
  removeAll: vi.fn(async () => undefined),
});

const releases: Array<() => void> = [];

afterEach(() => {
  releases.splice(0).forEach((release) => release());
  vi.clearAllMocks();
});

test('extension workers load their packaged module lazily', async () => {
  const channel = createWorkerTestChannel();
  const runtimeFiles = createRuntimeFiles();
  const detachRuntime = attachWorkerRuntime(definition, channel.worker);
  const createWorker = vi.fn(async () => channel.host);
  releases.push(registerExtensionWorkers(manifest, { coreApi, runtimeFiles, createWorker }));

  expect(runtimeFiles.readAsset).not.toHaveBeenCalled();

  const handle = await useWorkerStore().spawn<ExtensionTestWorkerContract>(
    'worker-extension.indexer',
  );

  expect(runtimeFiles.readAsset).toHaveBeenCalledWith(manifest, WORKER_ASSET.path);
  expect(createWorker).toHaveBeenCalledWith(WORKER_CONTENT, 'worker-extension.indexer');
  await expect(handle.call('read', '/notes/a.org')).resolves.toBe('content');

  handle.dispose();
  detachRuntime();
});

test('extension worker capabilities are enforced by the host', async () => {
  const channel = createWorkerTestChannel();
  const detachRuntime = attachWorkerRuntime(definition, channel.worker);
  releases.push(registerExtensionWorkers(manifest, {
    coreApi,
    runtimeFiles: createRuntimeFiles(),
    createWorker: async () => channel.host,
  }));
  const handle = await useWorkerStore().spawn<ExtensionTestWorkerContract>(
    'worker-extension.indexer',
  );

  await expect(
    handle.call('write', { path: '/notes/a.org', content: 'test' }),
  ).rejects.toMatchObject({ name: 'WorkerCapabilityDeniedError' });
  expect(coreWriteFile).not.toHaveBeenCalled();

  handle.dispose();
  detachRuntime();
});

test('unregistering extension workers disposes active handles', async () => {
  const channel = createWorkerTestChannel();
  const detachRuntime = attachWorkerRuntime(definition, channel.worker);
  const release = registerExtensionWorkers(manifest, {
    coreApi,
    runtimeFiles: createRuntimeFiles(),
    createWorker: async () => channel.host,
  });
  releases.push(release);
  const handle = await useWorkerStore().spawn<ExtensionTestWorkerContract>(
    'worker-extension.indexer',
  );

  release();

  expect(channel.isTerminated()).toBe(true);
  await expect(handle.call('read', '/notes/a.org')).rejects.toMatchObject({
    name: 'WorkerDisposedError',
  });
  detachRuntime();
});

test('extension worker startup fails when its asset is unavailable', async () => {
  const runtimeFiles = createRuntimeFiles();
  vi.mocked(runtimeFiles.readAsset).mockResolvedValue(undefined);
  releases.push(registerExtensionWorkers(manifest, {
    coreApi,
    runtimeFiles,
    createWorker: vi.fn(),
  }));

  await expect(
    useWorkerStore().spawn('worker-extension.indexer'),
  ).rejects.toMatchObject({ name: 'ExtensionWorkerAssetNotFoundError' });
});
