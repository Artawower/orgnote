import { createPinia, setActivePinia } from 'pinia';
import { useGitStore } from './git';
import { expect, test, vi, beforeEach } from 'vitest';
import type { GitProviderInfo, GitCommit, GitFile, GitRepoHandle } from 'orgnote-api';
import { ES_GIT_PROVIDER_ID } from 'src/infrastructure/git';

vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(() => vi.fn()),
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError: vi.fn(),
    reportWarning: vi.fn(),
  },
}));

const createMockRepoHandle = (): GitRepoHandle => ({
  config: { url: 'https://github.com/test/repo' },
  readFile: vi.fn().mockResolvedValue('file content'),
  listDirectory: vi.fn().mockResolvedValue([]),
  iterateFiles: vi.fn(),
  fileExists: vi.fn().mockResolvedValue(true),
  getLatestCommit: vi.fn().mockResolvedValue({
    hash: 'abc123',
    message: 'test commit',
    author: { name: 'Test', email: 'test@test.com' },
    timestamp: 1234567890,
  } as GitCommit),
  refresh: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
});

const createMockProviderInfo = (id: string, handle?: GitRepoHandle): GitProviderInfo => ({
  id,
  openRepo: vi.fn().mockResolvedValue(handle ?? createMockRepoHandle()),
  description: `Mock provider ${id}`,
});

beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
});

test('git store initial state has default es-git provider registered', () => {
  const store = useGitStore();

  expect(store.currentProviderId).toBe(ES_GIT_PROVIDER_ID);
  expect(Object.keys(store.providers)).toContain(ES_GIT_PROVIDER_ID);
});

test('git store registerProvider adds new provider', () => {
  const store = useGitStore();
  const providerInfo = createMockProviderInfo('custom-provider');

  store.registerProvider(providerInfo);

  expect(Object.keys(store.providers)).toContain('custom-provider');
});

test('git store registerProvider sets new provider as current', () => {
  const store = useGitStore();
  const providerInfo = createMockProviderInfo('high-priority');

  store.registerProvider(providerInfo);

  expect(store.currentProviderId).toBe('high-priority');
});

test('git store registerProvider always sets new provider as current', () => {
  const store = useGitStore();
  const firstProvider = createMockProviderInfo('first-provider');
  const secondProvider = createMockProviderInfo('second-provider');

  store.registerProvider(firstProvider);
  expect(store.currentProviderId).toBe('first-provider');

  store.registerProvider(secondProvider);
  expect(store.currentProviderId).toBe('second-provider');
});

test('git store setProvider changes current provider', () => {
  const store = useGitStore();
  const providerInfo = createMockProviderInfo('custom-provider');

  store.registerProvider(providerInfo);
  store.setProvider('custom-provider');

  expect(store.currentProviderId).toBe('custom-provider');
});

test('git store setProvider with non-existent id does not change current', () => {
  const store = useGitStore();
  const initialProviderId = store.currentProviderId;

  store.setProvider('non-existent');

  expect(store.currentProviderId).toBe(initialProviderId);
});

test('git store unregisterProvider removes provider', () => {
  const store = useGitStore();
  const providerInfo = createMockProviderInfo('to-remove');

  store.registerProvider(providerInfo);
  expect(Object.keys(store.providers)).toContain('to-remove');

  store.unregisterProvider('to-remove');
  expect(Object.keys(store.providers)).not.toContain('to-remove');
});

test('git store unregisterProvider of current provider switches to es-git', () => {
  const store = useGitStore();
  const providerInfo = createMockProviderInfo('high-priority');

  store.registerProvider(providerInfo);
  expect(store.currentProviderId).toBe('high-priority');

  store.unregisterProvider('high-priority');
  expect(store.currentProviderId).toBe(ES_GIT_PROVIDER_ID);
});

test('git store unregisterProvider does not remove default es-git provider', () => {
  const store = useGitStore();

  store.unregisterProvider(ES_GIT_PROVIDER_ID);

  expect(Object.keys(store.providers)).toContain(ES_GIT_PROVIDER_ID);
  expect(store.currentProviderId).toBe(ES_GIT_PROVIDER_ID);
});

test('git store openRepo returns wrapped handle from current provider', async () => {
  const store = useGitStore();
  const mockHandle = createMockRepoHandle();
  const providerInfo = createMockProviderInfo('test-provider', mockHandle);

  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };
  const handle = await store.openRepo(config);

  expect(providerInfo.openRepo).toHaveBeenCalledWith(config, expect.any(Object));
  expect(handle.config).toBe(mockHandle.config);
});

test('git store openRepo creates new handle on each call', async () => {
  const store = useGitStore();
  const config1 = { url: 'https://github.com/test/repo1' };
  const config2 = { url: 'https://github.com/test/repo2' };
  const mockHandle1 = { ...createMockRepoHandle(), config: config1 };
  const mockHandle2 = { ...createMockRepoHandle(), config: config2 };
  let callCount = 0;
  const providerInfo: GitProviderInfo = {
    id: 'test-provider',
    openRepo: vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(callCount === 1 ? mockHandle1 : mockHandle2);
    }),
    description: 'Test provider',
  };

  store.registerProvider(providerInfo);

  const handle1 = await store.openRepo(config1);
  const handle2 = await store.openRepo(config2);

  expect(providerInfo.openRepo).toHaveBeenCalledTimes(2);
  expect(handle1.config).toBe(config1);
  expect(handle2.config).toBe(config2);
});

test('git store handle readFile works correctly', async () => {
  const store = useGitStore();
  const mockHandle = createMockRepoHandle();
  const providerInfo = createMockProviderInfo('test-provider', mockHandle);

  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };
  const handle = await store.openRepo(config);
  const result = await handle.readFile('index.js');

  expect(mockHandle.readFile).toHaveBeenCalledWith('index.js');
  expect(result).toBe('file content');
});

test('git store handle getLatestCommit works correctly', async () => {
  const store = useGitStore();
  const mockHandle = createMockRepoHandle();
  const providerInfo = createMockProviderInfo('test-provider', mockHandle);

  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };
  const handle = await store.openRepo(config);
  const result = await handle.getLatestCommit();

  expect(mockHandle.getLatestCommit).toHaveBeenCalled();
  expect(result.hash).toBe('abc123');
  expect(result.message).toBe('test commit');
});

test('git store handle fileExists works correctly', async () => {
  const store = useGitStore();
  const mockHandle = createMockRepoHandle();
  const providerInfo = createMockProviderInfo('test-provider', mockHandle);

  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };
  const handle = await store.openRepo(config);
  const result = await handle.fileExists('package.json');

  expect(mockHandle.fileExists).toHaveBeenCalledWith('package.json');
  expect(result).toBe(true);
});

test('git store handle listDirectory works correctly', async () => {
  const store = useGitStore();
  const mockHandle = createMockRepoHandle();
  const expectedFiles: GitFile[] = [
    { path: 'src/index.ts', hash: 'abc', type: 'file' },
    { path: 'src/utils', hash: 'def', type: 'directory' },
  ];
  mockHandle.listDirectory = vi.fn().mockResolvedValue(expectedFiles);
  const providerInfo = createMockProviderInfo('test-provider', mockHandle);

  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };
  const handle = await store.openRepo(config);
  const result = await handle.listDirectory('src');

  expect(mockHandle.listDirectory).toHaveBeenCalledWith('src');
  expect(result).toEqual(expectedFiles);
});

test('git store handle iterateFiles works correctly', async () => {
  const store = useGitStore();
  const mockHandle = createMockRepoHandle();
  const expectedFiles: { file: GitFile; content: string }[] = [
    { file: { path: 'file1.ts', hash: 'a', type: 'file' }, content: 'content1' },
    { file: { path: 'file2.ts', hash: 'b', type: 'file' }, content: 'content2' },
  ];

  mockHandle.iterateFiles = async function* () {
    for (const item of expectedFiles) {
      yield item;
    }
  };

  const providerInfo = createMockProviderInfo('test-provider', mockHandle);
  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };
  const handle = await store.openRepo(config);
  const results: { file: GitFile; content: string }[] = [];

  for await (const item of handle.iterateFiles('src')) {
    results.push(item);
  }

  expect(results).toEqual(expectedFiles);
});

test('git store handle refresh works correctly', async () => {
  const store = useGitStore();
  const mockHandle = createMockRepoHandle();
  const providerInfo = createMockProviderInfo('test-provider', mockHandle);

  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };
  const handle = await store.openRepo(config);
  await handle.refresh();

  expect(mockHandle.refresh).toHaveBeenCalled();
});

test('git store handle close works correctly', async () => {
  const store = useGitStore();
  const mockHandle = createMockRepoHandle();
  const providerInfo = createMockProviderInfo('test-provider', mockHandle);

  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };
  const handle = await store.openRepo(config);
  handle.close();

  expect(mockHandle.close).toHaveBeenCalled();
});

test('git store reports error on openRepo failure', async () => {
  const { reporter } = await import('src/boot/report');
  const store = useGitStore();
  const testError = new Error('Open failed');
  const providerInfo: GitProviderInfo = {
    id: 'failing-provider',
    openRepo: vi.fn().mockRejectedValue(testError),
    description: 'Failing provider',
  };

  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };

  await expect(store.openRepo(config)).rejects.toThrow('Open failed');
  expect(reporter.reportError).toHaveBeenCalledWith(testError);
});

test('git store reports warning on openRepo GitFileNotFoundError', async () => {
  const { reporter } = await import('src/boot/report');
  const { GitFileNotFoundError } = await import('orgnote-api');
  const store = useGitStore();
  const fileNotFoundError = new GitFileNotFoundError('missing.txt');
  const providerInfo: GitProviderInfo = {
    id: 'failing-provider',
    openRepo: vi.fn().mockRejectedValue(fileNotFoundError),
    description: 'Failing provider',
  };

  store.registerProvider(providerInfo);

  const config = { url: 'https://github.com/test/repo' };

  await expect(store.openRepo(config)).rejects.toThrow(GitFileNotFoundError);
  expect(reporter.reportWarning).toHaveBeenCalledWith(fileNotFoundError);
  expect(reporter.reportError).not.toHaveBeenCalled();
});
