import type { FileMeta } from 'orgnote-api';
import { expect, test, vi } from 'vitest';
import { createTasksLoader } from './tasks-loader';

vi.mock('src/boot/report', () => ({ reporter: { reportError: vi.fn() } }));

const createDeferredFiles = () => {
  let resolve: (files: FileMeta[]) => void = () => undefined;
  const promise = new Promise<FileMeta[]>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('createTasksLoader reports initial loading only until the first successful load', async () => {
  const firstLoad = createDeferredFiles();
  const backgroundLoad = createDeferredFiles();
  const fetchFiles = vi
    .fn<() => Promise<FileMeta[]>>()
    .mockReturnValueOnce(firstLoad.promise)
    .mockReturnValueOnce(backgroundLoad.promise);
  const loader = createTasksLoader(fetchFiles, vi.fn());

  const initial = loader.load();
  const isLoadingInitially = loader.isInitialLoading.value;
  firstLoad.resolve([]);
  await initial;
  const background = loader.load();
  const isLoadingInBackground = loader.isInitialLoading.value;
  backgroundLoad.resolve([]);
  await background;

  expect(isLoadingInitially).toBe(true);
  expect(isLoadingInBackground).toBe(false);
  expect(loader.isInitialLoading.value).toBe(false);
});

test('createTasksLoader treats the load after a failed first load as initial', async () => {
  const retryLoad = createDeferredFiles();
  const onLoaded = vi.fn();
  const fetchFiles = vi
    .fn<() => Promise<FileMeta[]>>()
    .mockRejectedValueOnce(new Error('database unavailable'))
    .mockReturnValueOnce(retryLoad.promise);
  const loader = createTasksLoader(fetchFiles, onLoaded);

  await loader.load();
  const retry = loader.load();
  const isRetryInitial = loader.isInitialLoading.value;
  retryLoad.resolve([]);
  await retry;

  expect(isRetryInitial).toBe(true);
  expect(onLoaded).toHaveBeenCalledOnce();
});

const createFile = (id: string): FileMeta => ({ id, filePath: [`${id}.org`] });

test('createTasksLoader ignores an older load that finishes after a newer one', async () => {
  const olderLoad = createDeferredFiles();
  const newerLoad = createDeferredFiles();
  const onLoaded = vi.fn();
  const fetchFiles = vi
    .fn<() => Promise<FileMeta[]>>()
    .mockReturnValueOnce(olderLoad.promise)
    .mockReturnValueOnce(newerLoad.promise);
  const loader = createTasksLoader(fetchFiles, onLoaded);

  const older = loader.load();
  const newer = loader.load();
  newerLoad.resolve([createFile('newer')]);
  await newer;
  olderLoad.resolve([createFile('older')]);
  await older;

  expect(onLoaded.mock.calls).toEqual([[[createFile('newer')]]]);
});

test('createTasksLoader keeps initial loading while another initial load is still pending', async () => {
  const pendingLoad = createDeferredFiles();
  const fetchFiles = vi
    .fn<() => Promise<FileMeta[]>>()
    .mockRejectedValueOnce(new Error('database unavailable'))
    .mockReturnValueOnce(pendingLoad.promise);
  const loader = createTasksLoader(fetchFiles, vi.fn());

  const failed = loader.load();
  const pending = loader.load();
  await failed;
  const isStillLoading = loader.isInitialLoading.value;
  pendingLoad.resolve([]);
  await pending;

  expect(isStillLoading).toBe(true);
  expect(loader.isInitialLoading.value).toBe(false);
});
