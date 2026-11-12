import { EventEmitter } from 'node:events';
import { test, expect, vi, beforeEach } from 'vitest';
import type { SyncPlan, LocalFile, RemoteFile } from 'orgnote-api';
import { SyncOperationType } from 'orgnote-api';
import { isPlanEmpty, enqueuePlanOperations } from './sync-task-factory';

const mockAdd = vi.fn(async () => 'task-id');
const mockGetQueue = vi.fn();

vi.mock('src/stores/queue', () => ({
  useQueueStore: () => ({
    add: mockAdd,
    getQueue: mockGetQueue,
  }),
}));

const createEmptyPlan = (): SyncPlan => ({
  toUpload: [],
  toDownload: [],
  toDeleteLocal: [],
  toDeleteRemote: [],
  unchangedPaths: [],
  serverTime: '2024-01-01T00:00:00Z',
});

const createLocalFile = (path: string): LocalFile => ({
  path,
  mtime: 1000,
  size: 100,
});

const createRemoteFile = (path: string): RemoteFile => ({
  path,
  version: 1,
  deleted: false,
  updatedAt: '2024-01-01T00:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetQueue.mockReturnValue(undefined);
});

test('isPlanEmpty returns true for empty plan', () => {
  expect(isPlanEmpty(createEmptyPlan())).toBe(true);
});

test('isPlanEmpty returns false when toUpload has items', () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/test.org')];
  expect(isPlanEmpty(plan)).toBe(false);
});

test('isPlanEmpty returns false when toDownload has items', () => {
  const plan = createEmptyPlan();
  plan.toDownload = [createRemoteFile('/test.org')];
  expect(isPlanEmpty(plan)).toBe(false);
});

test('isPlanEmpty returns false when toDeleteLocal has items', () => {
  const plan = createEmptyPlan();
  plan.toDeleteLocal = ['/test.org'];
  expect(isPlanEmpty(plan)).toBe(false);
});

test('isPlanEmpty returns false when toDeleteRemote has items', () => {
  const plan = createEmptyPlan();
  plan.toDeleteRemote = ['/test.org'];
  expect(isPlanEmpty(plan)).toBe(false);
});

test('enqueuePlanOperations returns 0 for empty plan', async () => {
  const count = await enqueuePlanOperations(createEmptyPlan());

  expect(count).toBe(0);
  expect(mockAdd).not.toHaveBeenCalled();
});

test('enqueuePlanOperations enqueues upload tasks', async () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/file1.org'), createLocalFile('/file2.org')];

  const count = await enqueuePlanOperations(plan);

  expect(count).toBe(2);
  expect(mockAdd).toHaveBeenCalledTimes(2);
  expect(mockAdd).toHaveBeenCalledWith(
    'sync',
    expect.objectContaining({ type: SyncOperationType.Upload, data: plan.toUpload[0] }),
  );
});

test('enqueuePlanOperations limits concurrent task insertions', async () => {
  const taskCount = 26;
  const insertions = Array.from({ length: taskCount }, () =>
    Promise.withResolvers<string>()
  );
  const plan = createEmptyPlan();
  plan.toUpload = Array.from({ length: taskCount }, (_, index) =>
    createLocalFile(`/file-${index}.org`)
  );
  mockAdd.mockImplementation(
    () => insertions[mockAdd.mock.calls.length - 1]!.promise
  );

  const completion = enqueuePlanOperations(plan);
  await vi.waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(25));

  insertions
    .slice(0, 25)
    .forEach((insertion, index) => insertion.resolve(`task-${index}`));
  await vi.waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(taskCount));
  insertions[25]!.resolve('task-25');

  await expect(completion).resolves.toBe(taskCount);
});

test('enqueuePlanOperations enqueues download tasks', async () => {
  const plan = createEmptyPlan();
  plan.toDownload = [createRemoteFile('/file1.org')];

  const count = await enqueuePlanOperations(plan);

  expect(count).toBe(1);
  expect(mockAdd).toHaveBeenCalledWith(
    'sync',
    expect.objectContaining({ type: SyncOperationType.Download, data: plan.toDownload[0] }),
  );
});

test('enqueuePlanOperations enqueues deleteLocal tasks', async () => {
  const plan = createEmptyPlan();
  plan.toDeleteLocal = ['/file1.org', '/file2.org'];

  const count = await enqueuePlanOperations(plan);

  expect(count).toBe(2);
  expect(mockAdd).toHaveBeenCalledWith(
    'sync',
    expect.objectContaining({ type: SyncOperationType.DeleteLocal, data: '/file1.org' }),
  );
});

test('enqueuePlanOperations enqueues deleteRemote tasks', async () => {
  const plan = createEmptyPlan();
  plan.toDeleteRemote = ['/file1.org'];

  const count = await enqueuePlanOperations(plan);

  expect(count).toBe(1);
  expect(mockAdd).toHaveBeenCalledWith(
    'sync',
    expect.objectContaining({ type: SyncOperationType.DeleteRemote, data: '/file1.org' }),
  );
});

test('enqueuePlanOperations enqueues mixed operations', async () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/upload.org')];
  plan.toDownload = [createRemoteFile('/download.org')];
  plan.toDeleteLocal = ['/delete-local.org'];
  plan.toDeleteRemote = ['/delete-remote.org'];

  const count = await enqueuePlanOperations(plan);

  expect(count).toBe(4);
  expect(mockAdd).toHaveBeenCalledTimes(4);
});

test('enqueuePlanOperations includes serverTime in each task', async () => {
  const plan = createEmptyPlan();
  plan.serverTime = '2024-06-15T12:00:00Z';
  plan.toUpload = [createLocalFile('/file.org')];

  await enqueuePlanOperations(plan);

  expect(mockAdd).toHaveBeenCalledWith(
    'sync',
    expect.objectContaining({ serverTime: '2024-06-15T12:00:00Z' }),
  );
});

test('enqueuePlanOperations ignores drain before new task insertion', async () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/file.org')];
  const insertion = Promise.withResolvers<string>();
  const queue = new EventEmitter();
  mockAdd.mockImplementationOnce(async () => insertion.promise);
  mockGetQueue.mockReturnValue(queue);

  let isSettled = false;
  const completion = enqueuePlanOperations(plan);
  void completion.then(() => {
    isSettled = true;
  });
  await vi.waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));

  queue.emit('drain');
  insertion.resolve('new-task');
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  expect(isSettled).toBe(false);
  queue.emit('task_finish', 'new-task');
  await expect(completion).resolves.toBe(1);
});

test('enqueuePlanOperations waits for remaining tasks after one fails', async () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/failed.org'), createLocalFile('/finished.org')];
  const queue = new EventEmitter();
  mockAdd
    .mockResolvedValueOnce('failed-task')
    .mockResolvedValueOnce('finished-task');
  mockGetQueue.mockReturnValue(queue);

  let isSettled = false;
  const completion = enqueuePlanOperations(plan);
  void completion.then(
    () => {
      isSettled = true;
    },
    () => {
      isSettled = true;
    }
  );
  await vi.waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(2));

  queue.emit('task_failed', 'failed-task', new TypeError('upload failed'));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  expect(isSettled).toBe(false);

  queue.emit('task_finish', 'finished-task');
  await expect(completion).rejects.toThrow('Sync queue task failed: failed-task');
});

test('enqueuePlanOperations rejects a failed inserted task', async () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/file.org')];
  const insertion = Promise.withResolvers<string>();
  const queue = new EventEmitter();
  mockAdd.mockImplementationOnce(async () => insertion.promise);
  mockGetQueue.mockReturnValue(queue);

  const completion = enqueuePlanOperations(plan);
  await vi.waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
  queue.emit('task_failed', 'failed-task', new TypeError('upload failed'));
  insertion.resolve('failed-task');

  await expect(completion).rejects.toThrow('Sync queue task failed: failed-task');
});
