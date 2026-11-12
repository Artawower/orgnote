import { expect, expectTypeOf, test, vi } from 'vitest';
import { runWithConcurrency } from '../run-with-concurrency';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

test('runWithConcurrency returns results in input order', async () => {
  const result = await runWithConcurrency([3, 1, 2], 2, async (value) => {
    await sleep(value * 2);
    return `item-${value}`;
  });

  expect(result).toEqual(['item-3', 'item-1', 'item-2']);
});

test('runWithConcurrency does not exceed the concurrency limit', async () => {
  let activeCount = 0;
  let maxActiveCount = 0;

  await runWithConcurrency([1, 2, 3, 4, 5, 6], 3, async (value) => {
    activeCount += 1;
    maxActiveCount = Math.max(maxActiveCount, activeCount);
    await sleep(value === 1 ? 15 : 5);
    activeCount -= 1;
    return value;
  });

  expect(maxActiveCount).toBeLessThanOrEqual(3);
});

test('runWithConcurrency supports synchronous workers', async () => {
  const result = await runWithConcurrency([1, 2, 3], 2, (value) => value * 10);

  expect(result).toEqual([10, 20, 30]);
});

test('runWithConcurrency returns empty array for empty input', async () => {
  const worker = vi.fn();

  const result = await runWithConcurrency([], 4, worker);

  expect(result).toEqual([]);
  expect(worker).not.toHaveBeenCalled();
});

test('runWithConcurrency handles concurrency larger than input length', async () => {
  const result = await runWithConcurrency(
    [1, 2],
    100,
    async (value) => value * 2
  );

  expect(result).toEqual([2, 4]);
});

test('runWithConcurrency rejects invalid concurrency values', async () => {
  await expect(
    runWithConcurrency([1], 0, async (value) => value)
  ).rejects.toThrow(RangeError);
  await expect(
    runWithConcurrency([1], -1, async (value) => value)
  ).rejects.toThrow(RangeError);
  await expect(
    runWithConcurrency([1], 1.5, async (value) => value)
  ).rejects.toThrow(RangeError);
  await expect(
    runWithConcurrency([1], Number.POSITIVE_INFINITY, async (value) => value)
  ).rejects.toThrow(RangeError);
  await expect(
    runWithConcurrency([1], Number.NaN, async (value) => value)
  ).rejects.toThrow(RangeError);
});

test('runWithConcurrency rejects when worker fails', async () => {
  const failure = new Error('boom');

  await expect(
    runWithConcurrency([1, 2, 3], 2, async (value) => {
      if (value === 2) throw failure;
      await sleep(5);
      return value;
    })
  ).rejects.toBe(failure);
});

test('runWithConcurrency infers resolved result types', async () => {
  const promise = runWithConcurrency([1, 2, 3] as const, 2, async (value) => ({
    id: value,
    label: `item-${value}`,
  }));

  expectTypeOf(promise).toEqualTypeOf<
    Promise<Array<{ id: 1 | 2 | 3; label: string }>>
  >();

  const result = await promise;
  expect(result[0]).toEqual({ id: 1, label: 'item-1' });
});
