const assertConcurrency = (concurrency: number): void => {
  if (Number.isInteger(concurrency) && concurrency > 0) return;
  throw new RangeError('concurrency must be a positive integer');
};

const createWorkers = <TItem, TResult>(
  items: readonly TItem[],
  concurrency: number,
  worker: (item: TItem, index: number) => TResult | PromiseLike<TResult>,
  results: Awaited<TResult>[]
): Array<Promise<void>> => {
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]!, currentIndex);
    }
  };

  return Array.from({ length: Math.min(concurrency, items.length) }, () =>
    runWorker()
  );
};

/**
 * Run workers with a bounded concurrency level while preserving input order.
 * If one worker rejects, the returned promise rejects immediately. Other
 * in-flight workers may still finish their current item because promises are
 * not cancellable.
 */
export const runWithConcurrency = async <TItem, TResult>(
  items: readonly TItem[],
  concurrency: number,
  worker: (item: TItem, index: number) => TResult | PromiseLike<TResult>
): Promise<Array<Awaited<TResult>>> => {
  assertConcurrency(concurrency);
  if (items.length === 0) return [];

  const results = new Array<Awaited<TResult>>(items.length);
  const workers = createWorkers(items, concurrency, worker, results);

  await Promise.all(workers);
  return results;
};
