import { afterEach, expect, test } from 'vitest';
import { executeWithErrorHandling, getSyncConcurrency } from './sync.js';

const previousConcurrency = process.env.SYNC_CONCURRENCY;

afterEach(() => {
  process.env.SYNC_CONCURRENCY = previousConcurrency;
});

test('getSyncConcurrency returns default value for missing env', () => {
  delete process.env.SYNC_CONCURRENCY;

  expect(getSyncConcurrency()).toBe(4);
});

test('getSyncConcurrency returns env override', () => {
  process.env.SYNC_CONCURRENCY = '7';

  expect(getSyncConcurrency()).toBe(7);
});

test('executeWithErrorHandling limits concurrent processors', async () => {
  process.env.SYNC_CONCURRENCY = '2';
  let running = 0;
  let maxRunning = 0;
  const resolvers: Array<() => void> = [];

  const processor = async (_item: number): Promise<void> => {
    running += 1;
    maxRunning = Math.max(maxRunning, running);

    await new Promise<void>((resolve) => {
      resolvers.push(resolve);
    });

    running -= 1;
  };

  const promise = executeWithErrorHandling([1, 2, 3, 4, 5], processor, String, 'Test');

  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  expect(maxRunning).toBe(2);

  while (resolvers.length > 0) {
    resolvers.shift()?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  await expect(promise).resolves.toEqual({ success: 5, errors: 0 });
});

test('executeWithErrorHandling counts failed items without rejecting', async () => {
  process.env.SYNC_CONCURRENCY = '2';

  const result = await executeWithErrorHandling(
    [1, 2, 3],
    async (item) => {
      if (item === 2) throw new Error('boom');
    },
    String,
    'Test',
  );

  expect(result).toEqual({ success: 2, errors: 1 });
});
