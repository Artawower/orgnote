import { EventEmitter } from 'node:events';
import { expect, test } from 'vitest';
import {
  QueueIdleTimeoutError,
  waitForQueueDrain,
  type QueueDrainSource,
} from './wait-for-queue-drain';

interface TestQueue extends QueueDrainSource {
  length: number;
  emit(event: 'task_queued' | 'drain'): void;
  listenerCount(event: 'task_queued' | 'drain'): number;
}

const createQueue = (): TestQueue => {
  const emitter = new EventEmitter();
  return {
    length: 0,
    emit: (event) => {
      emitter.emit(event);
    },
    listenerCount: (event) => emitter.listenerCount(event),
    on: (event, listener) => {
      emitter.on(event, listener);
    },
    removeListener: (event, listener) => {
      emitter.removeListener(event, listener);
    },
  };
};

const resolveAfter = (durationMs: number): Promise<'timed-out'> =>
  new Promise((resolve) => setTimeout(() => resolve('timed-out'), durationMs));

test('waitForQueueDrain ignores a stale active snapshot after drain', async () => {
  const queue = createQueue();
  const waiting = waitForQueueDrain(
    queue,
    async () => {
      queue.length = 1;
      queue.emit('task_queued');
      queue.length = 0;
      queue.emit('drain');
    },
    async () => true,
  );

  const result = await Promise.race([waiting.then(() => 'completed' as const), resolveAfter(20)]);

  expect(result).toBe('completed');
});

test('waitForQueueDrain waits for restored active tasks before the first drain', async () => {
  const queue = createQueue();
  const waiting = waitForQueueDrain(queue, async () => {}, async () => true);

  const result = await Promise.race([
    waiting.then(() => 'completed' as const),
    resolveAfter(5),
  ]);

  expect(result).toBe('timed-out');
  queue.emit('drain');
  await waiting;
});

test('waitForQueueDrain times out and removes queue listeners', async () => {
  const queue = createQueue();
  queue.length = 1;

  const waiting = waitForQueueDrain(
    queue,
    async () => {
      queue.emit('task_queued');
    },
    undefined,
    { timeoutMs: 5 },
  );

  await expect(waiting).rejects.toBeInstanceOf(QueueIdleTimeoutError);
  expect(queue.listenerCount('task_queued')).toBe(0);
  expect(queue.listenerCount('drain')).toBe(0);
});

test('waitForQueueDrain aborts and removes queue listeners', async () => {
  const queue = createQueue();
  const controller = new AbortController();
  const waiting = waitForQueueDrain(
    queue,
    async () => {
      queue.length = 1;
      queue.emit('task_queued');
    },
    undefined,
    { signal: controller.signal },
  );

  controller.abort(new DOMException('filesystem unmounted', 'AbortError'));

  await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
  expect(queue.listenerCount('task_queued')).toBe(0);
  expect(queue.listenerCount('drain')).toBe(0);
});

test('waitForQueueDrain propagates operation errors and removes listeners', async () => {
  const queue = createQueue();
  const operationError = new TypeError('scan failed');

  const waiting = waitForQueueDrain(queue, async () => {
    throw operationError;
  });

  await expect(waiting).rejects.toBe(operationError);
  expect(queue.listenerCount('task_queued')).toBe(0);
  expect(queue.listenerCount('drain')).toBe(0);
});
