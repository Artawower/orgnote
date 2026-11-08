import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';
import { useFileIndexing } from './use-file-indexing';

const fsMounted = ref(false);
const isIndexing = ref(false);
const isWatching = ref(false);
const execute = vi.fn(async () => {});
const processFile = vi.fn(async () => {});
const removeFile = vi.fn(async () => {});
const reportError = vi.fn();
let watchedCallback: ((change: { path: string; type: 'modify' }) => Promise<void>) | undefined;
let scope: EffectScope;

const fileSearchStore = reactive({
  isIndexing,
  processFile,
  removeFile,
});

vi.mock('src/stores/command', () => ({
  useCommandsStore: vi.fn(() => ({ execute })),
}));

vi.mock('src/stores/file-search', () => ({
  useFileSearchStore: vi.fn(() => fileSearchStore),
}));

vi.mock('src/stores/file-system', () => ({
  useFileSystemStore: vi.fn(() => ({ fileInfo: vi.fn(), readDir: vi.fn() })),
}));

vi.mock('src/stores/file-system-manager', () => ({
  useFileSystemManagerStore: vi.fn(() => ({ fsMounted })),
}));

vi.mock('src/stores/file-watcher', () => ({
  useFileWatcherStore: vi.fn(() => ({
    isWatching,
    watch: vi.fn(
      (_path: string, callback: (change: { path: string; type: 'modify' }) => Promise<void>) => {
        watchedCallback = callback;
      },
    ),
  })),
}));

vi.mock('src/boot/report', () => ({
  reporter: { reportError: (error: Error) => reportError(error) },
}));

beforeEach(() => {
  scope?.stop();
  scope = effectScope();
  fsMounted.value = false;
  isIndexing.value = false;
  isWatching.value = false;
  watchedCallback = undefined;
  execute.mockReset();
  execute.mockResolvedValue(undefined);
  processFile.mockReset();
  processFile.mockResolvedValue(undefined);
  removeFile.mockClear();
  reportError.mockClear();
});

const startFileIndexing = (): void => {
  scope.run(() => useFileIndexing({} as never));
};

test('useFileIndexing initializes after every filesystem mount', async () => {
  startFileIndexing();

  fsMounted.value = true;
  await nextTick();
  fsMounted.value = false;
  await nextTick();
  fsMounted.value = true;
  await nextTick();

  expect(execute).toHaveBeenCalledTimes(2);
});

test('useFileIndexing processes buffered changes when indexing completes', async () => {
  fsMounted.value = true;
  isIndexing.value = true;
  isWatching.value = true;
  startFileIndexing();

  await watchedCallback?.({ type: 'modify', path: '/notes/pending.org' });
  expect(processFile).not.toHaveBeenCalled();

  isIndexing.value = false;
  await nextTick();

  expect(processFile).toHaveBeenCalledWith('/notes/pending.org');
});

test('useFileIndexing discards buffered changes after filesystem unmount', async () => {
  fsMounted.value = true;
  isIndexing.value = true;
  isWatching.value = true;
  startFileIndexing();

  await watchedCallback?.({ type: 'modify', path: '/notes/pending.org' });
  expect(processFile).not.toHaveBeenCalled();

  fsMounted.value = false;
  await nextTick();
  isIndexing.value = false;
  await nextTick();

  expect(processFile).not.toHaveBeenCalled();
});

test('useFileIndexing reports initialization failures', async () => {
  const initializationError = new TypeError('index initialization failed');
  execute.mockRejectedValueOnce(initializationError);
  startFileIndexing();

  fsMounted.value = true;
  await nextTick();
  await Promise.resolve();

  expect(reportError).toHaveBeenCalledWith(initializationError);
});

test('useFileIndexing reports buffered change failures', async () => {
  const processingError = new TypeError('file processing failed');
  fsMounted.value = true;
  isIndexing.value = true;
  isWatching.value = true;
  processFile.mockRejectedValueOnce(processingError);
  startFileIndexing();

  await watchedCallback?.({ type: 'modify', path: '/notes/pending.org' });
  isIndexing.value = false;
  await nextTick();
  await vi.waitFor(() => expect(reportError).toHaveBeenCalledWith(processingError));
});
