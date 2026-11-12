import { to } from 'orgnote-api/utils';

export interface TargetSelection {
  fsName: string;
  targetVault?: string;
}

interface TransitionWaiter {
  resolve: () => void;
  reject: (err: unknown) => void;
}

export interface TransitionRunnerOptions {
  checkShouldReset: (target: TargetSelection) => boolean;
  onResetRevoke: () => void;
  resetStorage: () => Promise<void>;
  onResetFailure: () => void;
  applyAndReconcile: (target: TargetSelection) => Promise<void>;
}

export interface FileSystemTransitionRunner {
  requestTransition: (target: TargetSelection) => Promise<void>;
  isActive: () => boolean;
  getPendingTarget: () => TargetSelection | null;
}

export const createFileSystemTransitionRunner = (
  options: TransitionRunnerOptions,
): FileSystemTransitionRunner => {
  let pendingTarget: TargetSelection | null = null;
  let pendingWaiters: TransitionWaiter[] = [];
  let activeTransition: Promise<void> | null = null;

  const rejectWaiters = (waiters: TransitionWaiter[], error: unknown): void => {
    waiters.forEach((w) => w.reject(error));
  };

  const resolveWaiters = (waiters: TransitionWaiter[]): void => {
    waiters.forEach((w) => w.resolve());
  };

  const failTransition = (waiters: TransitionWaiter[], error: unknown): void => {
    pendingWaiters = [];
    pendingTarget = null;
    activeTransition = null;
    rejectWaiters(waiters, error);
  };

  const performReset = async (): Promise<boolean> => {
    options.onResetRevoke();
    const result = await to(options.resetStorage)();
    if (result.isErr()) {
      options.onResetFailure();
      failTransition(pendingWaiters, result.error);
      return false;
    }
    return true;
  };

  const executeTransition = async (): Promise<void> => {
    if (!pendingTarget) {
      activeTransition = null;
      return;
    }
    const target = pendingTarget;
    pendingTarget = null;
    if (options.checkShouldReset(target) && !(await performReset())) return;

    const finalTarget = pendingTarget ?? target;
    pendingTarget = null;
    const currentWaiters = pendingWaiters;
    pendingWaiters = [];

    const reconcileResult = await to(() => options.applyAndReconcile(finalTarget))();
    if (reconcileResult.isErr()) {
      failTransition([...currentWaiters, ...pendingWaiters], reconcileResult.error);
      return;
    }
    resolveWaiters(currentWaiters);
    if (pendingTarget) {
      activeTransition = executeTransition();
      await activeTransition;
      return;
    }
    activeTransition = null;
  };

  const requestTransition = (target: TargetSelection): Promise<void> => {
    pendingTarget = target;
    const promise = new Promise<void>((resolve, reject) => {
      pendingWaiters.push({ resolve, reject });
    });
    if (!activeTransition) {
      activeTransition = executeTransition();
    }
    return promise;
  };

  const isActive = (): boolean => Boolean(activeTransition);
  const getPendingTarget = (): TargetSelection | null => pendingTarget;

  return {
    requestTransition,
    isActive,
    getPendingTarget,
  };
};
