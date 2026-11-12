import type { ProcessFn, QueueCreationOptions } from 'orgnote-api';
import type { QueueRuntime } from './better-queue-runtime';

type BatchQueueRuntime<TPayload, TResult> = Pick<
  QueueRuntime<TPayload, TResult>,
  'enqueueUnique' | 'handle' | 'pause'
>;

interface BatchQueueDependencies {
  clearStoredTasks(queueId: string): void;
  create<TPayload, TResult>(
    queueId: string,
    options: QueueCreationOptions<TPayload, TResult>,
  ): BatchQueueRuntime<TPayload, TResult>;
  destroy(queueId: string): void;
}

interface BatchCreationContext<TPayload, TResult> {
  dependencies: BatchQueueDependencies;
  options: QueueCreationOptions<TPayload, TResult>;
  originalProcess: ProcessFn<TPayload, TResult>;
  state: BatchState<TResult>;
}

interface BatchEventListeners<TResult> {
  onTaskFailed(taskId: string, error: unknown): void;
  onTaskFinish(taskId: string, result: TResult): void;
}

interface BatchState<TResult> {
  completedCount: number;
  hasError: boolean;
  reject(reason?: unknown): void;
  resolve(value: TResult[]): void;
  results: TResult[];
  totalTasks: number;
}

class QueueProcessRequiredError extends Error {
  constructor() {
    super('process function is required in options');
    this.name = 'QueueProcessRequiredError';
  }
}

const createBatchState = <TResult>(
  totalTasks: number,
  resolve: (value: TResult[]) => void,
  reject: (reason?: unknown) => void,
): BatchState<TResult> => ({
  results: [],
  completedCount: 0,
  hasError: false,
  totalTasks,
  resolve,
  reject,
});

const createBatchQueue = <TPayload, TResult>(
  queueId: string,
  context: BatchCreationContext<TPayload, TResult>,
): BatchQueueRuntime<TPayload, TResult> => {
  const process: ProcessFn<TPayload, TResult> = (task, callback) => {
    if (context.state.hasError) {
      callback();
      return;
    }
    context.originalProcess(task, callback);
  };
  return context.dependencies.create(queueId, { ...context.options, process });
};

const cleanupBatchQueue = <TPayload, TResult>(
  runtime: BatchQueueRuntime<TPayload, TResult>,
  queueId: string,
  dependencies: BatchQueueDependencies,
  listeners: BatchEventListeners<TResult>,
): void => {
  runtime.pause();
  runtime.handle.removeListener('task_finish', listeners.onTaskFinish);
  runtime.handle.removeListener('task_failed', listeners.onTaskFailed);
  dependencies.destroy(queueId);
  dependencies.clearStoredTasks(queueId);
};

const setupBatchEventHandlers = <TPayload, TResult>(
  runtime: BatchQueueRuntime<TPayload, TResult>,
  queueId: string,
  state: BatchState<TResult>,
  dependencies: BatchQueueDependencies,
): ((error: unknown) => void) => {
  const cleanup = () =>
    cleanupBatchQueue(runtime, queueId, dependencies, { onTaskFinish, onTaskFailed });
  const fail = (error: unknown): void => {
    if (state.hasError) return;
    state.hasError = true;
    cleanup();
    state.reject(error);
  };
  function onTaskFinish(_taskId: string, result: TResult): void {
    if (state.hasError) return;
    state.results.push(result);
    state.completedCount += 1;
    if (state.completedCount !== state.totalTasks) return;
    cleanup();
    state.resolve(state.results);
  }
  function onTaskFailed(_taskId: string, error: unknown): void {
    fail(error);
  }
  runtime.handle.on('task_finish', onTaskFinish);
  runtime.handle.on('task_failed', onTaskFailed);
  return fail;
};

const enqueueBatchItems = async <TPayload, TResult>(
  runtime: BatchQueueRuntime<TPayload, TResult>,
  data: TPayload[],
): Promise<void> => {
  await Promise.all(data.map((payload) => runtime.enqueueUnique(payload)));
};

export const executeBatchTasks = <TPayload = unknown, TResult = unknown>(
  options: QueueCreationOptions<TPayload, TResult>,
  data: TPayload[],
  dependencies: BatchQueueDependencies,
): Promise<TResult[]> => {
  if (!Array.isArray(data) || data.length === 0) return Promise.resolve([]);
  const originalProcess = options.process;
  if (!originalProcess) return Promise.reject(new QueueProcessRequiredError());

  const queueId = `batch-${crypto.randomUUID()}`;
  const { promise, resolve, reject } = Promise.withResolvers<TResult[]>();
  const state = createBatchState(data.length, resolve, reject);
  const runtime = createBatchQueue(queueId, { options, originalProcess, state, dependencies });
  const fail = setupBatchEventHandlers(runtime, queueId, state, dependencies);
  void enqueueBatchItems(runtime, data).catch(fail);
  return promise;
};
