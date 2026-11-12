import type { QueueHandle, QueueOperation, QueueRunOptions } from 'orgnote-api';
import { to } from 'orgnote-api/utils';

export type QueueDrainSource = QueueHandle;

type QueueDrainState = {
  completion: {
    promise: Promise<void>;
    resolve(): void;
  };
  drainCount: number;
  hasQueuedTasks: boolean;
  isOperationComplete: boolean;
};

type AbortGate = {
  dispose(): void;
  promise: Promise<never>;
  signal: AbortSignal;
};

type QueueDrainListeners = {
  onDrain(): void;
  onTaskQueued(): void;
};

interface QueueOperationContext {
  hasActiveTasks?: () => Promise<boolean>;
  operation: QueueOperation;
  queue: QueueDrainSource;
  signal: AbortSignal;
  state: QueueDrainState;
}

export class QueueIdleTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Queue did not become idle within ${timeoutMs}ms`);
    this.name = 'QueueIdleTimeoutError';
  }
}

const createQueueDrainState = (): QueueDrainState => ({
  completion: Promise.withResolvers<void>(),
  drainCount: 0,
  hasQueuedTasks: false,
  isOperationComplete: false,
});

const getAbortReason = (signal: AbortSignal): Error => {
  if (signal.reason instanceof Error) return signal.reason;
  return new DOMException('Queue idle wait aborted', 'AbortError');
};

const createTimeout = (
  controller: AbortController,
  timeoutMs?: number,
): ReturnType<typeof setTimeout> | undefined =>
  timeoutMs
    ? setTimeout(() => controller.abort(new QueueIdleTimeoutError(timeoutMs)), timeoutMs)
    : undefined;

const createAbortPromise = (signal: AbortSignal): Promise<never> => {
  if (signal.aborted) return Promise.reject(getAbortReason(signal));
  return new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(getAbortReason(signal)), { once: true });
  });
};

const createAbortGate = (options: QueueRunOptions): AbortGate => {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  const timeoutId = createTimeout(controller, options.timeoutMs);
  if (externalSignal?.aborted) onExternalAbort();
  if (externalSignal && !externalSignal.aborted) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  return {
    signal: controller.signal,
    promise: createAbortPromise(controller.signal),
    dispose: () => {
      if (timeoutId) clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
};

const removeListeners = (
  queue: QueueDrainSource,
  onTaskQueued: () => void,
  onDrain: () => void,
): void => {
  queue.removeListener('task_queued', onTaskQueued);
  queue.removeListener('drain', onDrain);
};

const markActiveTasks = async (
  queue: QueueDrainSource,
  state: QueueDrainState,
  hasActiveTasks?: () => Promise<boolean>,
): Promise<void> => {
  if (!hasActiveTasks) return;
  const observedDrainCount = state.drainCount;
  const isActive = await hasActiveTasks();
  if (!isActive || state.drainCount !== observedDrainCount) return;
  if (queue.length === 0 && state.drainCount > 0) return;
  state.hasQueuedTasks = true;
};

const throwWaitError = (operationError?: Error, completionError?: Error): void => {
  if (operationError) throw operationError;
  if (completionError) throw completionError;
};

const createQueueListeners = (state: QueueDrainState): QueueDrainListeners => ({
  onTaskQueued: () => {
    state.hasQueuedTasks = true;
  },
  onDrain: () => {
    state.drainCount += 1;
    state.hasQueuedTasks = false;
    if (state.isOperationComplete) state.completion.resolve();
  },
});

const executeQueueOperation = async (context: QueueOperationContext): Promise<void> => {
  await context.operation(context.signal);
  await markActiveTasks(context.queue, context.state, context.hasActiveTasks);
};

export const waitForQueueDrain = async (
  queue: QueueDrainSource,
  operation: QueueOperation,
  hasActiveTasks?: () => Promise<boolean>,
  options: QueueRunOptions = {},
): Promise<void> => {
  const state = createQueueDrainState();
  const abortGate = createAbortGate(options);
  const { onTaskQueued, onDrain } = createQueueListeners(state);
  queue.on('task_queued', onTaskQueued);
  queue.on('drain', onDrain);
  const operationResult = await to(() =>
    Promise.race([
      executeQueueOperation({ queue, state, operation, hasActiveTasks, signal: abortGate.signal }),
      abortGate.promise,
    ]),
  )();
  state.isOperationComplete = true;
  if (!state.hasQueuedTasks || operationResult.isErr()) state.completion.resolve();
  const completionResult = await to(() =>
    Promise.race([state.completion.promise, abortGate.promise]),
  )();

  removeListeners(queue, onTaskQueued, onDrain);
  abortGate.dispose();
  const operationError = operationResult.isErr() ? operationResult.error : undefined;
  const completionError = completionResult.isErr() ? completionResult.error : undefined;
  throwWaitError(operationError, completionError);
};
