import { to } from 'orgnote-api/utils';

/**
 * Wraps an async function to prevent concurrent executions.
 * If called while already running, remembers the pending call.
 * After the current execution finishes, re-runs once to handle the pending call.
 */
export const withCoalescing = (fn: () => Promise<void>): (() => Promise<void>) => {
  let running = false;
  let pendingRun = false;

  const execute = async (): Promise<void> => {
    pendingRun = false;
    await to(fn)();
    if (!pendingRun) return;
    await execute();
  };

  return async (): Promise<void> => {
    if (running) {
      pendingRun = true;
      return;
    }
    running = true;
    await execute();
    running = false;
  };
};
