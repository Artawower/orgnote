import { expect, test, vi } from 'vitest';
import {
  createFileSystemTransitionRunner,
  type TargetSelection,
} from './file-system-transition-runner';

test('executes a single transition without reset when not needed', async () => {
  const applied: TargetSelection[] = [];
  const runner = createFileSystemTransitionRunner({
    checkShouldReset: () => false,
    onResetRevoke: vi.fn(),
    resetStorage: vi.fn(async () => undefined),
    onResetFailure: vi.fn(),
    applyAndReconcile: async (target) => {
      applied.push(target);
    },
  });

  await runner.requestTransition({ fsName: 'fs-a' });
  expect(applied).toEqual([{ fsName: 'fs-a' }]);
  expect(runner.isActive()).toBe(false);
  expect(runner.getPendingTarget()).toBeNull();
});

test('coalesces concurrent requests during reset and applies latest target once', async () => {
  let resolveReset!: () => void;
  const resetDeferred = new Promise<void>((resolve) => {
    resolveReset = resolve;
  });

  const applied: TargetSelection[] = [];
  const resetSpy = vi.fn(async () => resetDeferred);

  const runner = createFileSystemTransitionRunner({
    checkShouldReset: () => true,
    onResetRevoke: vi.fn(),
    resetStorage: resetSpy,
    onResetFailure: vi.fn(),
    applyAndReconcile: async (target) => {
      applied.push(target);
    },
  });

  const p1 = runner.requestTransition({ fsName: 'fs-b' });
  const p2 = runner.requestTransition({ fsName: 'fs-c' });

  resolveReset();
  await Promise.all([p1, p2]);

  expect(resetSpy).toHaveBeenCalledTimes(1);
  expect(applied).toEqual([{ fsName: 'fs-c' }]);
  expect(runner.isActive()).toBe(false);
});

test('rejects all waiters and clears state when reset fails', async () => {
  let rejectReset!: (err: Error) => void;
  const resetDeferred = new Promise<void>((_, reject) => {
    rejectReset = reject;
  });

  const onResetFailure = vi.fn();
  const runner = createFileSystemTransitionRunner({
    checkShouldReset: () => true,
    onResetRevoke: vi.fn(),
    resetStorage: () => resetDeferred,
    onResetFailure,
    applyAndReconcile: vi.fn(async () => undefined),
  });

  const p1 = runner.requestTransition({ fsName: 'fs-b' });
  const p2 = runner.requestTransition({ fsName: 'fs-c' });

  rejectReset(new Error('reset failed'));
  const results = await Promise.allSettled([p1, p2]);

  expect(results[0].status).toBe('rejected');
  expect(results[1].status).toBe('rejected');
  expect(onResetFailure).toHaveBeenCalledTimes(1);
  expect(runner.isActive()).toBe(false);
  expect(runner.getPendingTarget()).toBeNull();
});

test('rejects all waiters and clears state when reconcile fails with pending request', async () => {
  let rejectReconcile!: (err: Error) => void;
  const reconcileDeferred = new Promise<void>((_, reject) => {
    rejectReconcile = reject;
  });

  const applied: TargetSelection[] = [];
  const runner = createFileSystemTransitionRunner({
    checkShouldReset: () => false,
    onResetRevoke: vi.fn(),
    resetStorage: vi.fn(async () => undefined),
    onResetFailure: vi.fn(),
    applyAndReconcile: async (target) => {
      applied.push(target);
      if (target.fsName === 'fs-fail') {
        return reconcileDeferred;
      }
    },
  });

  const p1 = runner.requestTransition({ fsName: 'fs-fail' });
  const p2 = runner.requestTransition({ fsName: 'fs-pending' });

  rejectReconcile(new Error('reconcile failed'));
  const results = await Promise.allSettled([p1, p2]);

  expect(results[0].status).toBe('rejected');
  expect(results[1].status).toBe('rejected');
  expect(runner.isActive()).toBe(false);
  expect(runner.getPendingTarget()).toBeNull();

  await runner.requestTransition({ fsName: 'fs-subsequent' });
  expect(applied).toEqual([
    { fsName: 'fs-fail' },
    { fsName: 'fs-subsequent' },
  ]);
});
