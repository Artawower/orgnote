import 'fake-indexeddb/auto';
import { setActivePinia, createPinia } from 'pinia';
import { test, expect, beforeEach, vi } from 'vitest';
import { useExtensionsStore } from './extension';
import type { ExtensionManifest, ExtensionMeta, ExtensionSource } from 'orgnote-api';
import { fetchExtensionPackageFromRepo } from 'src/extensions/fetch-extension-package';
import type { ExtensionInstallerRequest } from 'src/extensions/extension-installer-contract';

const installerMocks = vi.hoisted(() => ({
  fetchPackage: vi.fn(),
}));

vi.mock('src/extensions/extension-installer-client', () => ({
  fetchExtensionPackageInWorker: installerMocks.fetchPackage,
}));

const workerLifecycleMocks = vi.hoisted(() => ({
  register: vi.fn(),
  release: vi.fn(),
}));

vi.mock('src/extensions/extension-workers', () => ({
  registerExtensionWorkers: workerLifecycleMocks.register,
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useWorkers: vi.fn(() => ({})),
    },
    infrastructure: {
      extensionSourceRepository: {
        get: vi.fn(),
        upsert: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError: vi.fn(),
    reportWarning: vi.fn(),
  },
}));

const mockReadFile = vi.fn().mockResolvedValue(null);
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockRemoveDirectory = vi.fn().mockResolvedValue(undefined);
const mockOpenRepo = vi.fn();

vi.mock('./file-system', () => ({
  useFileSystemStore: () => ({
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    rmdir: mockRemoveDirectory,
  }),
}));

vi.mock('./git', () => ({
  useGitStore: () => ({
    openRepo: mockOpenRepo,
  }),
}));

vi.mock('./config', () => ({
  useConfigStore: () => ({
    config: {
      ui: {
        darkThemeName: null,
        lightThemeName: null,
      },
      developer: {
        corsProxy: 'https://proxy.example/',
      },
    },
  }),
}));

vi.mock('src/utils/css-utils', () => ({
  resetCSSVariables: vi.fn(),
}));

vi.mock('src/extensions', () => ({
  BUILTIN_LOADERS: {},
  BUILTIN_META: [],
}));

vi.mock('src/utils/read-extension', () => ({
  compileExtension: vi.fn(),
  parseExtension: vi.fn(),
  parseExtensionFromFile: vi.fn(),
}));

vi.mock('src/utils/validate-manifest', () => ({
  validateManifest: vi.fn(),
}));

const createMockManifest = (
  name: string,
  overrides?: Partial<ExtensionManifest>,
): ExtensionManifest => ({
  name,
  version: '1.0.0',
  category: 'extension',
  source: { type: 'local' },
  ...overrides,
});

const createMockExtensionMeta = (
  name: string,
  overrides?: Partial<ExtensionMeta>,
): ExtensionMeta => ({
  manifest: createMockManifest(name),
  active: false,
  ...overrides,
});

const createMockExtensionSource = (name: string): ExtensionSource => ({
  name,
  version: '1.0.0',
  source: 'local',
  module: 'export const onMounted = () => {}',
  docFiles: [],
});

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  workerLifecycleMocks.register.mockReturnValue(workerLifecycleMocks.release);
  installerMocks.fetchPackage.mockImplementation(async (
    _workers: unknown,
    request: ExtensionInstallerRequest,
  ) => {
    const repo = await mockOpenRepo({
      url: request.source.repo,
      branch: request.source.branch ?? request.source.tag,
    });
    return await fetchExtensionPackageFromRepo(repo, request);
  });
});

test('extensions list is empty initially', () => {
  const store = useExtensionsStore();

  expect(store.extensions).toHaveLength(0);
});

test('ready is true initially when not syncing', () => {
  const store = useExtensionsStore();

  expect(store.ready).toBe(true);
});

test('isExtensionExist returns false for non-existent extension', () => {
  const store = useExtensionsStore();

  expect(store.isExtensionExist('non-existent')).toBe(false);
});

test('isExtensionExist returns true after adding extension', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('test-extension');
  const source = createMockExtensionSource('test-extension');

  await store.addExtension(meta, source);

  expect(store.isExtensionExist('test-extension')).toBe(true);
});

test('addExtension adds extension to list', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('my-extension');
  const source = createMockExtensionSource('my-extension');

  await store.addExtension(meta, source);

  expect(store.extensions).toHaveLength(1);
  expect(store.extensions[0]?.manifest.name).toBe('my-extension');
});

test('addExtension replaces existing extension with same name', async () => {
  const store = useExtensionsStore();
  const meta1 = createMockExtensionMeta('duplicate', {
    manifest: createMockManifest('duplicate', { version: '1.0.0' }),
  });
  const meta2 = createMockExtensionMeta('duplicate', {
    manifest: createMockManifest('duplicate', { version: '2.0.0' }),
  });
  const source = createMockExtensionSource('duplicate');

  await store.addExtension(meta1, source);
  await store.addExtension(meta2, source);

  expect(store.extensions).toHaveLength(1);
  expect(store.extensions[0]?.manifest.version).toBe('2.0.0');
});

test('deleteExtension removes extension runtime files', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('runtime-delete');

  await store.addExtension(meta, createMockExtensionSource('runtime-delete'));
  await store.deleteExtension('runtime-delete');

  expect(mockRemoveDirectory).toHaveBeenCalledWith('.orgnote/extensions/runtime-delete');
});

test('deleteExtension removes extension from list', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('to-delete');
  const source = createMockExtensionSource('to-delete');

  await store.addExtension(meta, source);
  expect(store.extensions).toHaveLength(1);

  await store.deleteExtension('to-delete');

  expect(store.extensions).toHaveLength(0);
});

test('deleteExtension does nothing for non-existent extension', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('existing');
  const source = createMockExtensionSource('existing');

  await store.addExtension(meta, source);

  await store.deleteExtension('non-existent');

  expect(store.extensions).toHaveLength(1);
});

test('enableExtension does nothing for non-existent extension', async () => {
  const { reporter } = await import('src/boot/report');
  const store = useExtensionsStore();

  await store.enableExtension('non-existent');

  expect(reporter.reportWarning).toHaveBeenCalledWith('Extension non-existent not found');
});

test('enableExtension sets active to true', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('to-enable', { active: false });
  const source = createMockExtensionSource('to-enable');

  await store.addExtension(meta, source);
  await store.enableExtension('to-enable');

  const ext = store.extensions.find((e) => e.manifest.name === 'to-enable');
  expect(ext?.active).toBe(true);
});

test('enableExtension does nothing if already active', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('already-active', { active: true });
  const source = createMockExtensionSource('already-active');

  await store.addExtension(meta, source);

  const extensionsBefore = [...store.extensions];
  await store.enableExtension('already-active');

  expect(store.extensions[0]?.active).toBe(true);
  expect(store.extensions).toEqual(extensionsBefore);
});

test('disableExtension does nothing for non-existent extension', async () => {
  const { reporter } = await import('src/boot/report');
  const store = useExtensionsStore();

  await store.disableExtension('non-existent');

  expect(reporter.reportWarning).toHaveBeenCalledWith('Extension non-existent not found');
});

test('disableExtension sets active to false', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('to-disable', { active: true });
  const source = createMockExtensionSource('to-disable');

  await store.addExtension(meta, source);
  await store.disableExtension('to-disable');

  const ext = store.extensions.find((e) => e.manifest.name === 'to-disable');
  expect(ext?.active).toBe(false);
});

test('multiple extensions can be added', async () => {
  const store = useExtensionsStore();

  await store.addExtension(createMockExtensionMeta('ext-1'), createMockExtensionSource('ext-1'));
  await store.addExtension(createMockExtensionMeta('ext-2'), createMockExtensionSource('ext-2'));
  await store.addExtension(createMockExtensionMeta('ext-3'), createMockExtensionSource('ext-3'));

  expect(store.extensions).toHaveLength(3);
  expect(store.extensions.map((e) => e.manifest.name)).toEqual(['ext-1', 'ext-2', 'ext-3']);
});

test('deleteExtension removes only specified extension', async () => {
  const store = useExtensionsStore();

  await store.addExtension(createMockExtensionMeta('ext-1'), createMockExtensionSource('ext-1'));
  await store.addExtension(createMockExtensionMeta('ext-2'), createMockExtensionSource('ext-2'));
  await store.addExtension(createMockExtensionMeta('ext-3'), createMockExtensionSource('ext-3'));

  await store.deleteExtension('ext-2');

  expect(store.extensions).toHaveLength(2);
  expect(store.extensions.map((e) => e.manifest.name)).toEqual(['ext-1', 'ext-3']);
});

test('importExtension stores local module in the runtime filesystem', async () => {
  const { parseExtensionFromFile } = await import('src/utils/read-extension');
  const manifest = createMockManifest('local-runtime');
  const moduleContent = 'export default { onMounted() {} };';
  vi.mocked(parseExtensionFromFile).mockResolvedValue({
    manifest,
    module: { onMounted: vi.fn() },
    rawContent: moduleContent,
  });

  await useExtensionsStore().importExtension(new File([moduleContent], 'extension.js'));

  expect(mockWriteFile).toHaveBeenCalledWith(
    '.orgnote/extensions/local-runtime/1.0.0/index.js',
    moduleContent,
  );
});

test('importExtension rejects packages with external assets', async () => {
  const { parseExtensionFromFile } = await import('src/utils/read-extension');
  const { reporter } = await import('src/boot/report');
  const manifest = createMockManifest('local-assets', {
    assets: [
      {
        path: 'runtime.js',
        mediaType: 'text/javascript',
        size: 1,
        integrity: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      },
    ],
  });
  vi.mocked(parseExtensionFromFile).mockResolvedValue({
    manifest,
    module: { onMounted: vi.fn() },
    rawContent: 'export default {};',
  });

  await useExtensionsStore().importExtension(new File([''], 'extension.js'));

  expect(reporter.reportError).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining('Git source') }),
  );
  expect(mockWriteFile).not.toHaveBeenCalled();
});

test('installExtension throws for local source type', async () => {
  const { reporter } = await import('src/boot/report');
  const store = useExtensionsStore();

  await store.installExtension({ type: 'local' });

  expect(reporter.reportError).toHaveBeenCalled();
});

test('installExtension throws for builtin source type', async () => {
  const { reporter } = await import('src/boot/report');
  const store = useExtensionsStore();

  await store.installExtension({ type: 'builtin' });

  expect(reporter.reportError).toHaveBeenCalled();
});

test('installExtension stores the module in the runtime filesystem', async () => {
  const moduleContent = 'export default { onMounted() {} };';
  const manifest = createMockManifest('runtime-extension', {
    source: { type: 'git', repo: 'https://example.com/runtime-extension' },
  });
  mockOpenRepo.mockResolvedValue({
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn(async (path: string) =>
      path.endsWith('manifest.json') ? JSON.stringify(manifest) : moduleContent,
    ),
  });

  await useExtensionsStore().installExtension(manifest.source);

  expect(mockWriteFile).toHaveBeenCalledWith(
    '.orgnote/extensions/runtime-extension/1.0.0/index.js',
    moduleContent,
  );
});

test('installExtension delegates Git package loading to the worker', async () => {
  const { api } = await import('src/boot/api');
  const source = { type: 'git' as const, repo: 'https://example.com/worker-loaded' };
  const manifest = Object.freeze(createMockManifest('worker-loaded', { source }));
  installerMocks.fetchPackage.mockResolvedValue({
    manifest,
    rawContent: 'export default { onMounted() {} };',
    assets: [],
  });

  await useExtensionsStore().installExtension(source);

  expect(installerMocks.fetchPackage).toHaveBeenCalledWith(
    api.core.useWorkers(),
    { source, corsProxy: 'https://proxy.example/' },
  );
  expect(mockOpenRepo).not.toHaveBeenCalled();
  expect(mockWriteFile).toHaveBeenCalledWith(
    '.orgnote/extensions/worker-loaded/1.0.0/index.js',
    'export default { onMounted() {} };',
  );
});

test('installExtension adds source to a legacy package manifest', async () => {
  const { compileExtension, parseExtension } = await import('src/utils/read-extension');
  const source = { type: 'git' as const, repo: 'https://example.com/legacy-package' };
  const rawContent = 'export default { onMounted() {} };';
  const legacyManifest = createMockManifest('legacy-package', {
    source: { type: 'local' },
  });
  installerMocks.fetchPackage.mockResolvedValue({ rawContent, assets: [] });
  vi.mocked(parseExtension).mockResolvedValue({
    manifest: legacyManifest,
    module: { onMounted: vi.fn() },
    rawContent,
  });
  vi.mocked(compileExtension).mockResolvedValue({ onMounted: vi.fn() });
  const store = useExtensionsStore();

  await store.installExtension(source);

  expect(store.extensions[0]?.manifest.source).toEqual(source);
});

test('installExtension stores declared assets beside the module', async () => {
  const moduleContent = 'export default { onMounted() {} };';
  const assetContent = new Uint8Array([1, 2, 3]);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', assetContent));
  const { uint8ArrayToBase64 } = await import('orgnote-api');
  const manifest = createMockManifest('asset-extension', {
    source: { type: 'git', repo: 'https://example.com/asset-extension' },
    assets: [
      {
        path: 'fonts/font.woff2',
        mediaType: 'font/woff2',
        size: assetContent.byteLength,
        integrity: `sha256-${uint8ArrayToBase64(digest)}`,
      },
    ],
  });
  const readRepoFile = vi.fn(async (path: string, encoding?: string) => {
    if (path.endsWith('manifest.json')) return JSON.stringify(manifest);
    if (encoding === 'binary') return assetContent;
    return moduleContent;
  });
  mockOpenRepo.mockResolvedValue({
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: readRepoFile,
  });

  await useExtensionsStore().installExtension(manifest.source);

  expect(readRepoFile).toHaveBeenCalledWith(
    'dist/assets/fonts/font.woff2',
    'binary',
  );
  expect(mockWriteFile).toHaveBeenCalledWith(
    '.orgnote/extensions/asset-extension/1.0.0/assets/fonts/font.woff2',
    assetContent,
  );
});

test('installExtension restores the active version when an update fails to mount', async () => {
  const { api } = await import('src/boot/api');
  const { compileExtension } = await import('src/utils/read-extension');
  const previousModule = { onMounted: vi.fn(), onUnmounted: vi.fn() };
  vi.mocked(compileExtension).mockResolvedValue(previousModule);
  vi.mocked(api.infrastructure.extensionSourceRepository.get).mockResolvedValue(
    createMockExtensionSource('rollback-extension'),
  );
  const store = useExtensionsStore();
  const previousMeta = createMockExtensionMeta('rollback-extension', {
    manifest: createMockManifest('rollback-extension', { version: '1.0.0' }),
    active: true,
  });
  await store.addExtension(previousMeta, createMockExtensionSource('rollback-extension'));

  const nextManifest = createMockManifest('rollback-extension', {
    version: '2.0.0',
    source: { type: 'git', repo: 'https://example.com/rollback-extension' },
  });
  mockOpenRepo.mockResolvedValue({
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn(async (path: string) =>
      path.endsWith('manifest.json')
        ? JSON.stringify(nextManifest)
        : 'export default { onMounted() {} };',
    ),
  });
  vi.mocked(compileExtension).mockResolvedValueOnce({
    onMounted: vi.fn(() => {
      throw new Error('mount failed');
    }),
  });

  await store.installExtension(nextManifest.source);

  expect(store.extensions[0]?.manifest.version).toBe('1.0.0');
  expect(store.extensions[0]?.active).toBe(true);
  expect(previousModule.onMounted).toHaveBeenCalledTimes(2);
  expect(mockRemoveDirectory).toHaveBeenCalledWith(
    '.orgnote/extensions/rollback-extension/2.0.0',
  );
});

test('installExtension removes the previous runtime after a successful update', async () => {
  const { compileExtension } = await import('src/utils/read-extension');
  vi.mocked(compileExtension).mockResolvedValue({ onMounted: vi.fn(), onUnmounted: vi.fn() });
  const store = useExtensionsStore();
  const previousMeta = createMockExtensionMeta('updated-extension', {
    manifest: createMockManifest('updated-extension', { version: '1.0.0' }),
    active: true,
  });
  await store.addExtension(previousMeta, createMockExtensionSource('updated-extension'));

  const nextManifest = createMockManifest('updated-extension', {
    version: '2.0.0',
    source: { type: 'git', repo: 'https://example.com/updated-extension' },
  });
  mockOpenRepo.mockResolvedValue({
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn(async (path: string) =>
      path.endsWith('manifest.json')
        ? JSON.stringify(nextManifest)
        : 'export default { onMounted() {} };',
    ),
  });

  await store.installExtension(nextManifest.source);

  expect(store.extensions[0]?.manifest.version).toBe('2.0.0');
  expect(mockRemoveDirectory).toHaveBeenCalledWith(
    '.orgnote/extensions/updated-extension/1.0.0',
  );
});

test('installExtension preserves the active version when runtime writing fails', async () => {
  const { compileExtension } = await import('src/utils/read-extension');
  vi.mocked(compileExtension).mockResolvedValue({ onMounted: vi.fn(), onUnmounted: vi.fn() });
  const store = useExtensionsStore();
  const previousMeta = createMockExtensionMeta('write-failure-extension', {
    manifest: createMockManifest('write-failure-extension', { version: '1.0.0' }),
    active: true,
  });
  await store.addExtension(previousMeta, createMockExtensionSource('write-failure-extension'));

  const nextManifest = createMockManifest('write-failure-extension', {
    version: '2.0.0',
    source: { type: 'git', repo: 'https://example.com/write-failure-extension' },
  });
  mockOpenRepo.mockResolvedValue({
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn(async (path: string) =>
      path.endsWith('manifest.json')
        ? JSON.stringify(nextManifest)
        : 'export default { onMounted() {} };',
    ),
  });
  mockWriteFile.mockRejectedValueOnce(new Error('write failed'));
  previousMeta.active = true;

  await store.installExtension(nextManifest.source);

  expect(store.extensions[0]?.manifest.version).toBe('1.0.0');
  expect(store.extensions[0]?.active).toBe(true);
  expect(mockRemoveDirectory).toHaveBeenCalledWith(
    '.orgnote/extensions/write-failure-extension/2.0.0',
  );
});

test('installExtension restores the active version when compilation fails', async () => {
  const { compileExtension } = await import('src/utils/read-extension');
  const previousModule = { onMounted: vi.fn(), onUnmounted: vi.fn() };
  vi.mocked(compileExtension).mockResolvedValue(previousModule);
  const store = useExtensionsStore();
  const previousMeta = createMockExtensionMeta('compile-failure-extension', {
    manifest: createMockManifest('compile-failure-extension', { version: '1.0.0' }),
    active: true,
  });
  await store.addExtension(previousMeta, createMockExtensionSource('compile-failure-extension'));

  const nextManifest = createMockManifest('compile-failure-extension', {
    version: '2.0.0',
    source: { type: 'git', repo: 'https://example.com/compile-failure-extension' },
  });
  mockOpenRepo.mockResolvedValue({
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn(async (path: string) =>
      path.endsWith('manifest.json')
        ? JSON.stringify(nextManifest)
        : 'export default { onMounted() {} };',
    ),
  });
  vi.mocked(compileExtension)
    .mockRejectedValueOnce(new SyntaxError('compile failed'))
    .mockResolvedValue(previousModule);
  previousMeta.active = true;

  await store.installExtension(nextManifest.source);

  expect(store.extensions[0]?.manifest.version).toBe('1.0.0');
  expect(store.extensions[0]?.active).toBe(true);
  expect(previousMeta.active).toBe(true);
  expect(mockRemoveDirectory).toHaveBeenCalledWith(
    '.orgnote/extensions/compile-failure-extension/2.0.0',
  );
});

test('installExtension keeps an active same-version runtime unchanged', async () => {
  const { compileExtension } = await import('src/utils/read-extension');
  vi.mocked(compileExtension).mockResolvedValue({ onMounted: vi.fn(), onUnmounted: vi.fn() });
  const store = useExtensionsStore();
  const manifest = createMockManifest('immutable-extension', {
    source: { type: 'git', repo: 'https://example.com/immutable-extension' },
  });
  const previousMeta = createMockExtensionMeta('immutable-extension', {
    manifest,
    active: true,
  });
  await store.addExtension(previousMeta, createMockExtensionSource('immutable-extension'));
  previousMeta.active = true;
  mockOpenRepo.mockResolvedValue({
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn(async (path: string) =>
      path.endsWith('manifest.json')
        ? JSON.stringify(manifest)
        : 'export default { onMounted() { throw new Error("changed"); } };',
    ),
  });
  vi.clearAllMocks();

  await store.installExtension(manifest.source);

  expect(mockWriteFile).not.toHaveBeenCalled();
  expect(mockRemoveDirectory).not.toHaveBeenCalled();
  expect(store.extensions[0]?.active).toBe(true);
});

test('installExtension does not duplicate runtime source in the legacy repository', async () => {
  const { api } = await import('src/boot/api');
  const moduleContent = 'export default { onMounted() {} };';
  const manifest = createMockManifest('filesystem-extension', {
    source: { type: 'git', repo: 'https://example.com/filesystem-extension' },
  });
  mockOpenRepo.mockResolvedValue({
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn(async (path: string) =>
      path.endsWith('manifest.json') ? JSON.stringify(manifest) : moduleContent,
    ),
  });

  await useExtensionsStore().installExtension(manifest.source);

  expect(api.infrastructure.extensionSourceRepository.upsert).not.toHaveBeenCalled();
});

test('enable and disable cycle works correctly', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('toggle-ext', { active: false });
  const source = createMockExtensionSource('toggle-ext');

  await store.addExtension(meta, source);

  expect(store.extensions[0]?.active).toBe(false);

  await store.enableExtension('toggle-ext');
  expect(store.extensions[0]?.active).toBe(true);

  await store.disableExtension('toggle-ext');
  expect(store.extensions[0]?.active).toBe(false);

  await store.enableExtension('toggle-ext');
  expect(store.extensions[0]?.active).toBe(true);
});

test('addExtension with active true mounts before marking extension active', async () => {
  const { compileExtension } = await import('src/utils/read-extension');
  const module = { onMounted: vi.fn() };
  vi.mocked(compileExtension).mockResolvedValue(module);
  const { api } = await import('src/boot/api');
  vi.mocked(api.infrastructure.extensionSourceRepository.get).mockResolvedValue(
    createMockExtensionSource('auto-enable'),
  );
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('auto-enable', { active: true });
  const source = createMockExtensionSource('auto-enable');

  await store.addExtension(meta, source);

  expect(module.onMounted).toHaveBeenCalledOnce();
  expect(workerLifecycleMocks.register).toHaveBeenCalledWith(meta.manifest);
  expect(store.extensions[0]?.active).toBe(true);

  await store.disableExtension('auto-enable');

  expect(workerLifecycleMocks.release).toHaveBeenCalledOnce();
});

test('addExtension leaves extension inactive when mount fails', async () => {
  const { compileExtension } = await import('src/utils/read-extension');
  const { api } = await import('src/boot/api');
  vi.mocked(api.infrastructure.extensionSourceRepository.get).mockResolvedValue(
    createMockExtensionSource('broken-extension'),
  );
  vi.mocked(compileExtension).mockResolvedValue({
    onMounted: vi.fn(() => {
      throw new Error('mount failed');
    }),
  });
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('broken-extension', { active: true });

  await store.addExtension(meta, createMockExtensionSource('broken-extension'));

  expect(store.extensions[0]?.active).toBe(false);
  expect(workerLifecycleMocks.register).toHaveBeenCalledWith(meta.manifest);
  expect(workerLifecycleMocks.release).toHaveBeenCalledOnce();
});

test('isExtensionExist handles empty string', () => {
  const store = useExtensionsStore();

  expect(store.isExtensionExist('')).toBe(false);
});

test('isExtensionExist is case sensitive', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('CaseSensitive');
  const source = createMockExtensionSource('CaseSensitive');

  await store.addExtension(meta, source);

  expect(store.isExtensionExist('CaseSensitive')).toBe(true);
  expect(store.isExtensionExist('casesensitive')).toBe(false);
  expect(store.isExtensionExist('CASESENSITIVE')).toBe(false);
});

test('deleteExtension is case sensitive', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('CaseSensitive');
  const source = createMockExtensionSource('CaseSensitive');

  await store.addExtension(meta, source);

  await store.deleteExtension('casesensitive');
  expect(store.extensions).toHaveLength(1);

  await store.deleteExtension('CaseSensitive');
  expect(store.extensions).toHaveLength(0);
});

test('enableExtension is case sensitive', async () => {
  const { reporter } = await import('src/boot/report');
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('CaseSensitive', { active: false });
  const source = createMockExtensionSource('CaseSensitive');

  await store.addExtension(meta, source);

  await store.enableExtension('casesensitive');
  expect(reporter.reportWarning).toHaveBeenCalled();
  expect(store.extensions[0]?.active).toBe(false);
});

test('sync sets ready to true after completion', async () => {
  const store = useExtensionsStore();

  await store.sync();

  expect(store.ready).toBe(true);
});

test('extensions with special characters in name', async () => {
  const store = useExtensionsStore();
  const specialName = 'ext-with_special.chars@1.0';
  const meta = createMockExtensionMeta(specialName);
  const source = createMockExtensionSource(specialName);

  await store.addExtension(meta, source);

  expect(store.isExtensionExist(specialName)).toBe(true);
  expect(store.extensions[0]?.manifest.name).toBe(specialName);
});

test('addExtension preserves other extensions when replacing', async () => {
  const store = useExtensionsStore();

  await store.addExtension(createMockExtensionMeta('ext-1'), createMockExtensionSource('ext-1'));
  await store.addExtension(createMockExtensionMeta('ext-2'), createMockExtensionSource('ext-2'));
  await store.addExtension(createMockExtensionMeta('ext-3'), createMockExtensionSource('ext-3'));

  const updatedMeta = createMockExtensionMeta('ext-2', {
    manifest: createMockManifest('ext-2', { version: '9.9.9' }),
  });
  await store.addExtension(updatedMeta, createMockExtensionSource('ext-2'));

  expect(store.extensions).toHaveLength(3);
  expect(store.extensions.find((e) => e.manifest.name === 'ext-1')).toBeDefined();
  expect(store.extensions.find((e) => e.manifest.name === 'ext-3')).toBeDefined();
  expect(store.extensions.find((e) => e.manifest.name === 'ext-2')?.manifest.version).toBe('9.9.9');
});

test('disableExtension on already disabled extension', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('disabled-ext', { active: false });
  const source = createMockExtensionSource('disabled-ext');

  await store.addExtension(meta, source);

  await store.disableExtension('disabled-ext');

  expect(store.extensions[0]?.active).toBe(false);
});

test('rapid enable/disable does not corrupt state', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('rapid-toggle', { active: false });
  const source = createMockExtensionSource('rapid-toggle');

  await store.addExtension(meta, source);

  await Promise.all([
    store.enableExtension('rapid-toggle'),
    store.disableExtension('rapid-toggle'),
    store.enableExtension('rapid-toggle'),
  ]);

  const ext = store.extensions.find((e) => e.manifest.name === 'rapid-toggle');
  expect(ext).toBeDefined();
  expect(typeof ext?.active).toBe('boolean');
});

test('deleteExtension while extension is active', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('active-delete', { active: true });
  const source = createMockExtensionSource('active-delete');

  await store.addExtension(meta, source);
  await store.enableExtension('active-delete');

  await store.deleteExtension('active-delete');

  expect(store.extensions).toHaveLength(0);
  expect(store.isExtensionExist('active-delete')).toBe(false);
});

test('theme extension disables other themes when enabled', async () => {
  const store = useExtensionsStore();

  const theme1 = createMockExtensionMeta('theme-1', {
    manifest: createMockManifest('theme-1', { category: 'theme' }),
    active: true,
  });
  const theme2 = createMockExtensionMeta('theme-2', {
    manifest: createMockManifest('theme-2', { category: 'theme' }),
    active: false,
  });

  await store.addExtension(theme1, createMockExtensionSource('theme-1'));
  await store.addExtension(theme2, createMockExtensionSource('theme-2'));

  await store.enableExtension('theme-2');

  const t1 = store.extensions.find((e) => e.manifest.name === 'theme-1');
  const t2 = store.extensions.find((e) => e.manifest.name === 'theme-2');

  expect(t2?.active).toBe(true);
  expect(t1?.active).toBe(false);
});

test('non-theme extension does not affect other extensions', async () => {
  const module = createMockModuleWithSettings({}, {});
  await setupModuleCompile('ext-1', module);
  const store = useExtensionsStore();

  const ext1 = createMockExtensionMeta('ext-1', { active: true });
  const ext2 = createMockExtensionMeta('ext-2', { active: false });

  await store.addExtension(ext1, createMockExtensionSource('ext-1'));
  await store.addExtension(ext2, createMockExtensionSource('ext-2'));

  await store.enableExtension('ext-2');

  expect(store.extensions.find((e) => e.manifest.name === 'ext-1')?.active).toBe(true);
  expect(store.extensions.find((e) => e.manifest.name === 'ext-2')?.active).toBe(true);
});

test('enableSafeMode keeps local extensions active', async () => {
  const store = useExtensionsStore();

  const localExt = createMockExtensionMeta('local-ext', {
    manifest: createMockManifest('local-ext', { source: { type: 'local' } }),
    active: true,
  });

  await store.addExtension(localExt, createMockExtensionSource('local-ext'));
  await store.enableExtension('local-ext');

  await store.enableSafeMode();

  expect(store.extensions.find((e) => e.manifest.name === 'local-ext')?.active).toBe(true);
});

test('disableSafeMode remounts active extensions', async () => {
  const module = createMockModuleWithSettings({}, {});
  await setupModuleCompile('safe-mode-ext', module);
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('safe-mode-ext', { active: true });
  const source = createMockExtensionSource('safe-mode-ext');

  await store.addExtension(meta, source);

  await store.enableSafeMode();
  await store.disableSafeMode();

  expect(store.extensions.find((e) => e.manifest.name === 'safe-mode-ext')?.active).toBe(true);
});

test('addExtension with empty name', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('');
  const source = createMockExtensionSource('');

  await store.addExtension(meta, source);

  expect(store.extensions).toHaveLength(1);
  expect(store.isExtensionExist('')).toBe(true);
});

test('multiple theme extensions - only one active at a time', async () => {
  const store = useExtensionsStore();

  const themes = ['theme-a', 'theme-b', 'theme-c'].map((name) =>
    createMockExtensionMeta(name, {
      manifest: createMockManifest(name, { category: 'theme' }),
      active: false,
    }),
  );

  for (const theme of themes) {
    await store.addExtension(theme, createMockExtensionSource(theme.manifest.name));
  }

  await store.enableExtension('theme-a');
  await store.enableExtension('theme-b');
  await store.enableExtension('theme-c');

  const activeThemes = store.extensions.filter((e) => e.manifest.category === 'theme' && e.active);

  expect(activeThemes).toHaveLength(1);
  expect(activeThemes[0]?.manifest.name).toBe('theme-c');
});

test('extension config is preserved after enable/disable', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('config-ext', {
    active: false,
    config: { setting1: 'value1', setting2: 42 },
  });
  const source = createMockExtensionSource('config-ext');

  await store.addExtension(meta, source);
  await store.enableExtension('config-ext');
  await store.disableExtension('config-ext');

  const ext = store.extensions.find((e) => e.manifest.name === 'config-ext');
  expect(ext?.config).toEqual({ setting1: 'value1', setting2: 42 });
});

test('deleteExtension multiple times is safe', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('multi-delete');
  const source = createMockExtensionSource('multi-delete');

  await store.addExtension(meta, source);

  await store.deleteExtension('multi-delete');
  await store.deleteExtension('multi-delete');
  await store.deleteExtension('multi-delete');

  expect(store.extensions).toHaveLength(0);
});

test('sync multiple times does not duplicate extensions', async () => {
  const store = useExtensionsStore();

  await store.sync();
  await store.sync();
  await store.sync();

  const uniqueNames = new Set(store.extensions.map((e) => e.manifest.name));
  expect(uniqueNames.size).toBe(store.extensions.length);
});

test('extension order is preserved after operations', async () => {
  const store = useExtensionsStore();
  const names = ['first', 'second', 'third'];

  for (const name of names) {
    await store.addExtension(createMockExtensionMeta(name), createMockExtensionSource(name));
  }

  await store.enableExtension('second');
  await store.disableExtension('second');

  expect(store.extensions.map((e) => e.manifest.name)).toEqual(names);
});

const createMockModuleWithSettings = (
  settingsSchema: Record<string, unknown>,
  defaultSettings: Record<string, unknown>,
) => ({
  settingsSchema,
  defaultSettings,
  onMounted: vi.fn().mockResolvedValue(undefined),
  onUnmounted: vi.fn().mockResolvedValue(undefined),
});

test('sync restores missing Git runtime files from the extension source', async () => {
  const { stringifyToml } = await import('orgnote-api/utils');
  const moduleContent = 'export default { onMounted() {} };';
  const manifest = createMockManifest('restored-extension', {
    source: { type: 'git', repo: 'https://example.com/restored-extension' },
  });
  mockReadFile.mockResolvedValueOnce(
    stringifyToml({ extensions: [{ manifest, active: true }] }),
  );
  mockOpenRepo.mockResolvedValue({
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn(async (path: string) =>
      path.endsWith('manifest.json') ? JSON.stringify(manifest) : moduleContent,
    ),
  });

  await useExtensionsStore().sync();

  expect(mockWriteFile).toHaveBeenCalledWith(
    '.orgnote/extensions/restored-extension/1.0.0/index.js',
    moduleContent,
  );
  expect(useExtensionsStore().extensions[0]?.active).toBe(true);
});

test('sync migrates legacy extension source into runtime files', async () => {
  const { api } = await import('src/boot/api');
  const { compileExtension } = await import('src/utils/read-extension');
  const { stringifyToml } = await import('orgnote-api/utils');
  const manifest = createMockManifest('legacy-extension');
  mockReadFile.mockResolvedValueOnce(
    stringifyToml({ extensions: [{ manifest, active: true }] }),
  );
  vi.mocked(api.infrastructure.extensionSourceRepository.get).mockResolvedValue({
    name: manifest.name,
    version: manifest.version,
    source: 'local',
    module: encodeURIComponent('export default { onMounted() {} };'),
    docFiles: [],
  });
  vi.mocked(compileExtension).mockResolvedValue({ onMounted: vi.fn() });

  await useExtensionsStore().sync();

  expect(mockWriteFile).toHaveBeenCalledWith(
    '.orgnote/extensions/legacy-extension/1.0.0/index.js',
    'export default { onMounted() {} };',
  );
});

const setupModuleCompile = async (name: string, module: unknown) => {
  const { compileExtension } = await import('src/utils/read-extension');
  const { api } = await import('src/boot/api');
  vi.mocked(compileExtension).mockResolvedValue(module as never);
  vi.mocked(api.infrastructure.extensionSourceRepository.get).mockResolvedValue({
    name,
    version: '1.0.0',
    source: 'local',
    module: '',
    docFiles: [],
  });
};

test('defaultSettings are applied before onMounted when config is empty', async () => {
  const store = useExtensionsStore();
  const defaults = { enabled: true, count: 5 };
  const module = createMockModuleWithSettings({}, defaults);
  await setupModuleCompile('settings-ext', module);

  const meta = createMockExtensionMeta('settings-ext', { active: false });
  await store.addExtension(meta, createMockExtensionSource('settings-ext'));
  await store.enableExtension('settings-ext');

  expect(module.onMounted).toHaveBeenCalled();
  const ext = store.extensions.find((e) => e.manifest.name === 'settings-ext');
  expect(ext?.config).toMatchObject(defaults);
});

test('saved top-level keys override defaults entirely', async () => {
  const store = useExtensionsStore();
  const defaults = { appearance: { theme: 'dark', compact: false }, enabled: true };
  const saved = { appearance: { theme: 'light' } };
  const module = createMockModuleWithSettings({}, defaults);
  await setupModuleCompile('nested-ext', module);

  const meta = createMockExtensionMeta('nested-ext', { active: false, config: saved });
  await store.addExtension(meta, createMockExtensionSource('nested-ext'));
  await store.enableExtension('nested-ext');

  const ext = store.extensions.find((e) => e.manifest.name === 'nested-ext');
  expect(ext?.config).toEqual({ appearance: { theme: 'light' }, enabled: true });
});

test('getExtensionConfig returns empty object for unknown extension', () => {
  const store = useExtensionsStore();
  const config = store.getExtensionConfig('unknown');
  expect(config.value).toEqual({});
});

test('setExtensionConfig updates config and is reflected in getExtensionConfig', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('cfg-ext', { active: false });
  await store.addExtension(meta, createMockExtensionSource('cfg-ext'));

  await store.setExtensionConfig('cfg-ext', { key: 'value' });

  expect(store.getExtensionConfig('cfg-ext').value).toEqual({ key: 'value' });
});

test('hasExtensionSettings returns false for inactive extension', async () => {
  const store = useExtensionsStore();
  const meta = createMockExtensionMeta('inactive-ext', { active: false });
  await store.addExtension(meta, createMockExtensionSource('inactive-ext'));

  expect(store.hasExtensionSettings('inactive-ext')).toBe(false);
});

test('hasExtensionSettings returns true for active extension with settingsSchema', async () => {
  const store = useExtensionsStore();
  const schema = { type: 'object', entries: {} };
  const module = createMockModuleWithSettings(schema, {});
  await setupModuleCompile('schema-ext', module);

  const meta = createMockExtensionMeta('schema-ext', { active: false });
  await store.addExtension(meta, createMockExtensionSource('schema-ext'));
  await store.enableExtension('schema-ext');

  expect(store.hasExtensionSettings('schema-ext')).toBe(true);
});
