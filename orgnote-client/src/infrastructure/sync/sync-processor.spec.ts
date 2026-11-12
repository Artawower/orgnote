import { beforeEach, expect, test, vi } from 'vitest';
import {
  SyncOperationType,
  type LocalFile,
  type ProcessCallback,
  type SyncContext,
} from 'orgnote-api';
import type { SyncQueueTask } from 'src/models/sync-queue-task';
import { createQueueTaskProcessor } from './sync-processor';

const mocks = vi.hoisted(() => ({
  processUpload: vi.fn(),
  recordOperation: vi.fn(),
  reportWarning: vi.fn(),
}));

vi.mock('orgnote-api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('orgnote-api');
  return {
    ...actual,
    processUpload: mocks.processUpload,
  };
});

vi.mock('src/infrastructure/config/config-lifecycle-record', () => ({
  recordConfigSyncOperationEvent: mocks.recordOperation,
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportWarning: mocks.reportWarning,
  },
}));

const context = {} as SyncContext;
const upload: LocalFile = {
  path: '/note.org',
  mtime: 1,
  size: 1,
};
const task: SyncQueueTask = {
  type: SyncOperationType.Upload,
  data: upload,
  serverTime: '2026-01-01T00:00:00.000Z',
};
const rawTask = { payload: task };

beforeEach(() => {
  vi.clearAllMocks();
});

test('createQueueTaskProcessor preserves the void callback processor contract', async () => {
  mocks.processUpload.mockResolvedValue(undefined);
  const callback = vi.fn<ProcessCallback>();
  const processor = createQueueTaskProcessor({ getContext: () => context });

  const result = processor(rawTask, callback);

  expect(result).toBeUndefined();
  await vi.waitFor(() => expect(callback).toHaveBeenCalledOnce());
  expect(callback).toHaveBeenCalledWith(null);
});

test('createQueueTaskProcessor reports operation failures through the callback once', async () => {
  const failure = new Error('upload failed');
  mocks.processUpload.mockRejectedValue(failure);
  const callback = vi.fn<ProcessCallback>();
  const processor = createQueueTaskProcessor({ getContext: () => context });

  processor(rawTask, callback);

  await vi.waitFor(() => expect(callback).toHaveBeenCalledOnce());
  expect(callback).toHaveBeenCalledWith(failure);
  expect(mocks.reportWarning).toHaveBeenCalledOnce();
});

test('createQueueTaskProcessor fails synchronously when no sync context is available', () => {
  const callback = vi.fn<ProcessCallback>();
  const processor = createQueueTaskProcessor({ getContext: () => null });

  const result = processor(rawTask, callback);

  expect(result).toBeUndefined();
  expect(callback).toHaveBeenCalledOnce();
  expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  expect(mocks.processUpload).not.toHaveBeenCalled();
});
