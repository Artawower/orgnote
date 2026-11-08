import 'fake-indexeddb/auto';
import {
  createQueueRepository,
  QUEUE_MIGRATIONS,
  QUEUE_REPOSITORY_NAME,
  FINAL_STATUSES,
} from './queue-repository';
import type Dexie from 'dexie';
import { expect, test, beforeEach, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import type { QueueTask } from 'orgnote-api';
import { createDatabase } from './create-database';

const createMockTask = (overrides: Partial<QueueTask> = {}): QueueTask => ({
  id: faker.string.uuid(),
  payload: { data: faker.lorem.word() },
  queueId: 'test-queue',
  added: Date.now(),
  status: 'pending',
  ...overrides,
});

let db: Dexie;
let dropAll: () => Promise<void>;
let repository: ReturnType<typeof createQueueRepository>;

beforeEach(() => {
  const databaseSettings = createDatabase([
    { storeName: QUEUE_REPOSITORY_NAME, migrations: QUEUE_MIGRATIONS },
  ]);
  db = databaseSettings.db;
  dropAll = databaseSettings.dropAll;
  repository = createQueueRepository(db);
});

afterEach(async () => {
  await dropAll();
});

test('createQueueRepository add saves task with normalized values', async () => {
  const task = createMockTask();
  await repository.add(task);

  const result = await repository.get(task.id);

  expect(result).toBeDefined();
  expect(result?.status).toBe('pending');
  expect(result?.deletedAt).toBeUndefined();
});

test('createQueueRepository get returns undefined for non-existent task', async () => {
  const result = await repository.get('non-existent-id');

  expect(result).toBeUndefined();
});

test('createQueueRepository getAll returns tasks for specific queueId ordered by added', async () => {
  const task1 = createMockTask({ queueId: 'queue-a', added: 1000 });
  const task2 = createMockTask({ queueId: 'queue-a', added: 2000 });
  const task3 = createMockTask({ queueId: 'queue-b', added: 1500 });

  await repository.add(task1);
  await repository.add(task2);
  await repository.add(task3);

  const result = await repository.getAll('queue-a');

  expect(result).toHaveLength(2);
  expect(result[0]?.id).toBe(task1.id);
  expect(result[1]?.id).toBe(task2.id);
});

test('createQueueRepository getAll returns empty array for non-existent queueId', async () => {
  const task = createMockTask({ queueId: 'existing-queue' });
  await repository.add(task);

  const result = await repository.getAll('non-existent-queue');

  expect(result).toHaveLength(0);
});

test('createQueueRepository delete marks task as deleted with canceled status', async () => {
  const task = createMockTask({ status: 'pending' });
  await repository.add(task);

  await repository.delete(task.id);

  const result = await repository.get(task.id);
  expect(result?.deletedAt).toBeDefined();
  expect(result?.status).toBe('canceled');
  expect(result?.lockId).toBeUndefined();
  expect(result?.started).toBeUndefined();
});

test('createQueueRepository delete preserves final status', async () => {
  for (const finalStatus of FINAL_STATUSES) {
    const task = createMockTask();
    await repository.add(task);
    await repository.update(task.id, { status: finalStatus });

    await repository.delete(task.id);

    const result = await repository.get(task.id);
    expect(result?.status).toBe(finalStatus);
    expect(result?.deletedAt).toBeDefined();
  }
});

test('createQueueRepository delete does nothing for non-existent task', async () => {
  await expect(repository.delete('non-existent-id')).resolves.not.toThrow();
});

test('createQueueRepository lock sets started and processing status', async () => {
  const task = createMockTask();
  await repository.add(task);
  const beforeLock = Date.now();

  await repository.lock(task.id);

  const result = await repository.get(task.id);
  expect(result?.status).toBe('processing');
  expect(result?.started).toBeGreaterThanOrEqual(beforeLock);
});

test('createQueueRepository lock does nothing for deleted task', async () => {
  const task = createMockTask();
  await repository.add(task);
  await repository.delete(task.id);

  await repository.lock(task.id);

  const result = await repository.get(task.id);
  expect(result?.status).toBe('canceled');
});

test('createQueueRepository lock does nothing for non-existent task', async () => {
  await expect(repository.lock('non-existent-id')).resolves.not.toThrow();
});

test('createQueueRepository release resets task to pending status', async () => {
  const task = createMockTask({ lockId: 'some-lock', started: Date.now() });
  await repository.add(task);
  await repository.lock(task.id);

  await repository.release(task.id);

  const result = await repository.get(task.id);
  expect(result?.status).toBe('pending');
  expect(result?.started).toBeUndefined();
  expect(result?.lockId).toBeUndefined();
});

test('createQueueRepository release preserves final status', async () => {
  for (const finalStatus of FINAL_STATUSES) {
    const task = createMockTask({ lockId: 'some-lock', started: Date.now() });
    await repository.add(task);
    await repository.update(task.id, { status: finalStatus });

    await repository.release(task.id);

    const result = await repository.get(task.id);
    expect(result?.status).toBe(finalStatus);
    expect(result?.lockId).toBeUndefined();
    expect(result?.started).toBeUndefined();
  }
});

test('createQueueRepository release does nothing for deleted task', async () => {
  const task = createMockTask();
  await repository.add(task);
  await repository.delete(task.id);

  await repository.release(task.id);

  const result = await repository.get(task.id);
  expect(result?.status).toBe('canceled');
});

test('createQueueRepository release does nothing for non-existent task', async () => {
  await expect(repository.release('non-existent-id')).resolves.not.toThrow();
});

test('createQueueRepository takeFirstN locks N oldest pending tasks (FIFO order)', async () => {
  const firstTask = createMockTask({ queueId: 'test', added: 1000 });
  const secondTask = createMockTask({ queueId: 'test', added: 2000 });
  const thirdTask = createMockTask({ queueId: 'test', added: 3000 });

  await repository.add(thirdTask);
  await repository.add(firstTask);
  await repository.add(secondTask);

  const lockId = await repository.takeFirstN(2, 'test');

  expect(lockId).toBeTruthy();

  const locked = await repository.getLock(lockId);
  expect(locked).toBeDefined();
  expect(Object.keys(locked!)).toHaveLength(2);
  expect(locked![firstTask.id]).toBeDefined();
  expect(locked![secondTask.id]).toBeDefined();
  expect(locked![thirdTask.id]).toBeUndefined();
});

test('createQueueRepository takeFirstN returns empty string when no tasks available', async () => {
  const lockId = await repository.takeFirstN(5, 'empty-queue');

  expect(lockId).toBe('');
});

test('createQueueRepository takeFirstN skips already locked tasks', async () => {
  const lockedTask = createMockTask({ lockId: 'existing-lock', queueId: 'test' });
  const pendingTask = createMockTask({ queueId: 'test' });

  await repository.add(lockedTask);
  await repository.add(pendingTask);

  const lockId = await repository.takeFirstN(2, 'test');

  const locked = await repository.getLock(lockId);
  expect(Object.keys(locked!)).toHaveLength(1);
  expect(locked![pendingTask.id]).toBeDefined();
});

test('createQueueRepository takeFirstN skips deleted tasks', async () => {
  const task = createMockTask({ queueId: 'test' });
  await repository.add(task);
  await repository.delete(task.id);

  const lockId = await repository.takeFirstN(1, 'test');

  expect(lockId).toBe('');
});

test('createQueueRepository takeFirstN skips non-pending tasks', async () => {
  const processingTask = createMockTask({ queueId: 'test' });
  const pendingTask = createMockTask({ queueId: 'test' });

  await repository.add(processingTask);
  await repository.add(pendingTask);
  await repository.update(processingTask.id, { status: 'processing' });

  const lockId = await repository.takeFirstN(2, 'test');

  const locked = await repository.getLock(lockId);
  expect(Object.keys(locked!)).toHaveLength(1);
  expect(locked![pendingTask.id]).toBeDefined();
});

test('createQueueRepository clear removes all tasks for specific queueId', async () => {
  const task1 = createMockTask({ queueId: 'queue-to-clear' });
  const task2 = createMockTask({ queueId: 'queue-to-clear' });
  const task3 = createMockTask({ queueId: 'queue-to-keep' });

  await repository.add(task1);
  await repository.add(task2);
  await repository.add(task3);

  await repository.clear('queue-to-clear');

  const clearedQueue = await repository.getAll('queue-to-clear');
  const keptQueue = await repository.getAll('queue-to-keep');

  expect(clearedQueue).toHaveLength(0);
  expect(keptQueue).toHaveLength(1);
});

test('createQueueRepository getLock returns tasks with specific lockId', async () => {
  const task1 = createMockTask({ lockId: 'lock-123' });
  const task2 = createMockTask({ lockId: 'lock-123' });
  const task3 = createMockTask({ lockId: 'lock-456' });

  await repository.add(task1);
  await repository.add(task2);
  await repository.add(task3);

  const result = await repository.getLock('lock-123');

  expect(result).toBeDefined();
  expect(Object.keys(result!)).toHaveLength(2);
  expect(result![task1.id]).toBeDefined();
  expect(result![task2.id]).toBeDefined();
});

test('createQueueRepository getLock returns undefined for non-existent lockId', async () => {
  const result = await repository.getLock('non-existent-lock');

  expect(result).toBeUndefined();
});

test('createQueueRepository getRunningTasks returns locked non-deleted tasks', async () => {
  const runningTask = createMockTask({ lockId: 'lock-1', queueId: 'test' });
  const deletedRunningTask = createMockTask({ lockId: 'lock-2', queueId: 'test' });
  const pendingTask = createMockTask({ queueId: 'test' });

  await repository.add(runningTask);
  await repository.add(deletedRunningTask);
  await repository.add(pendingTask);
  await repository.delete(deletedRunningTask.id);

  const result = await repository.getRunningTasks('test');

  expect(Object.keys(result)).toHaveLength(1);
  expect(result[runningTask.id]).toBeDefined();
});

test('createQueueRepository getRunningTasks filters by queueId', async () => {
  const task1 = createMockTask({ lockId: 'lock-1', queueId: 'queue-a' });
  const task2 = createMockTask({ lockId: 'lock-2', queueId: 'queue-b' });

  await repository.add(task1);
  await repository.add(task2);

  const result = await repository.getRunningTasks('queue-a');

  expect(Object.keys(result)).toHaveLength(1);
  expect(result[task1.id]).toBeDefined();
});

test('createQueueRepository update modifies task status', async () => {
  const task = createMockTask({ status: 'pending' });
  await repository.add(task);

  await repository.update(task.id, { status: 'completed' });

  const result = await repository.get(task.id);
  expect(result?.status).toBe('completed');
});

test('createQueueRepository handles concurrent operations', async () => {
  const tasks = Array.from({ length: 10 }, () => createMockTask({ queueId: 'concurrent' }));

  await Promise.all(tasks.map((t) => repository.add(t)));

  const result = await repository.getAll('concurrent');
  expect(result).toHaveLength(10);
});

test('createQueueRepository takeFirstN sets correct task properties', async () => {
  const task = createMockTask({ queueId: 'test' });
  await repository.add(task);
  const beforeTake = Date.now();

  const lockId = await repository.takeFirstN(1, 'test');

  const result = await repository.get(task.id);
  expect(result?.lockId).toBe(lockId);
  expect(result?.status).toBe('processing');
  expect(result?.started).toBeGreaterThanOrEqual(beforeTake);
});
