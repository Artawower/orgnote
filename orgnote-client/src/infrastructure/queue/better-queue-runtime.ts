import Queue from 'better-queue';
import type { QueueOptions, Store } from 'better-queue';
import type {
  DeduplicationStrategy,
  ProcessFn,
  QueueCreationOptions,
  QueueHandle,
  QueueOperation,
  QueueProcessTask,
  QueueRepository,
  QueueRunOptions,
  QueueStats,
  QueueTask,
  QueueTaskOptions,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { logger } from 'src/boot/logger';
import { BetterQueuePersistenceStore } from './better-queue-persistence-store';
import {
  QueueIdleTimeoutError,
  waitForQueueDrain,
} from './wait-for-queue-drain';

const ACTIVE_TASK_STATUSES = new Set<QueueTask['status']>(['pending', 'processing']);
const DEFAULT_DEDUPLICATION_STRATEGY: DeduplicationStrategy = 'replace';

type DeduplicationHandler = (existing: QueueTask) => Promise<string>;

export interface QueueRuntime<TPayload = unknown, TResult = unknown> {
  readonly handle: QueueHandle<TPayload, TResult>;
  add(payload: TPayload, options?: QueueTaskOptions): Promise<string>;
  enqueueUnique(payload: TPayload): Promise<string>;
  cancel(taskId: string): Promise<void>;
  clear(): Promise<void>;
  destroy(): void;
  getStats(): QueueStats;
  pause(): void;
  resume(): void;
  runAndWaitForIdle(operation: QueueOperation, options?: QueueRunOptions): Promise<void>;
}

interface QueueRuntimeState<TPayload, TResult> {
  deduplicationStrategy: DeduplicationStrategy;
  handle: QueueHandle<TPayload, TResult>;
  lifecycleController: AbortController;
  pendingStatusUpdates: Set<Promise<void>>;
  queue: Queue<QueueProcessTask<TPayload>, TResult>;
  queueId: string;
  repository: QueueRepository;
}

class QueueTaskEnqueueError extends Error {
  constructor(cause: unknown) {
    super('Failed to enqueue queue task', { cause });
    this.name = 'QueueTaskEnqueueError';
  }
}

const createProcessFn = <TPayload, TResult>(
  options: QueueCreationOptions<TPayload, TResult>,
): ProcessFn<TPayload, TResult> => options.process ?? ((_task, callback) => callback());

const createQueue = <TPayload, TResult>(
  queueId: string,
  options: QueueCreationOptions<TPayload, TResult>,
  repository: QueueRepository,
): Queue<QueueProcessTask<TPayload>, TResult> => {
  const queueOptions: Partial<QueueOptions<QueueProcessTask<TPayload>, TResult>> = {
    ...options,
    store: new BetterQueuePersistenceStore(repository, queueId) as unknown as Store<
      QueueProcessTask<TPayload>
    >,
    id: 'id',
  };
  return new Queue(createProcessFn(options), queueOptions);
};

const createRuntimeState = <TPayload, TResult>(
  queueId: string,
  options: QueueCreationOptions<TPayload, TResult>,
  repository: QueueRepository,
): QueueRuntimeState<TPayload, TResult> => {
  const queue = createQueue(queueId, options, repository);
  return {
    queueId,
    repository,
    queue,
    handle: queue as unknown as QueueHandle<TPayload, TResult>,
    deduplicationStrategy:
      options.deduplicationStrategy ?? DEFAULT_DEDUPLICATION_STRATEGY,
    lifecycleController: new AbortController(),
    pendingStatusUpdates: new Set(),
  };
};

const enqueueTask = <TPayload, TResult>(
  queue: Queue<QueueProcessTask<TPayload>, TResult>,
  task: QueueProcessTask<TPayload>,
): Promise<string> => {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const ticket = queue.push(task);
  const removeListeners = () => {
    ticket.removeListener('queued', onQueued);
    ticket.removeListener('failed', onFailed);
  };
  function onQueued(): void {
    removeListeners();
    resolve(task.id);
  }
  function onFailed(error: unknown): void {
    removeListeners();
    reject(new QueueTaskEnqueueError(error));
  }
  ticket.once('queued', onQueued);
  ticket.once('failed', onFailed);
  return promise;
};

const createDeduplicationHandlers = <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
): Record<DeduplicationStrategy, DeduplicationHandler> => ({
  skip: async (existing) => existing.id,
  replace: async (existing) => {
    await state.repository.delete(existing.id, true);
    return '';
  },
  moveToEnd: async (existing) => {
    const priority = Date.now();
    await state.repository.update(existing.id, { priority, added: priority });
    return existing.id;
  },
});

const handleDeduplication = async <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
  id: string,
): Promise<string | null> => {
  const existing = await state.repository.get(id);
  if (!existing || existing.queueId !== state.queueId || existing.deletedAt) return null;
  return await createDeduplicationHandlers(state)[state.deduplicationStrategy](existing);
};

const addTask = async <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
  payload: TPayload,
  options?: QueueTaskOptions,
): Promise<string> => {
  const id = options?.id ?? crypto.randomUUID();
  const existingTaskId = await handleDeduplication(state, id);
  if (existingTaskId) return existingTaskId;
  return await enqueueTask(state.queue, { id, payload });
};

const enqueueUniqueTask = <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
  payload: TPayload,
): Promise<string> => enqueueTask(state.queue, { id: crypto.randomUUID(), payload });

const cancelTask = <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
  taskId: string,
): Promise<void> => new Promise((resolve) => state.queue.cancel(taskId, () => resolve()));

const abortWaiters = <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
  action: string,
  shouldRenew: boolean,
): void => {
  state.lifecycleController.abort(
    new DOMException(`Queue ${state.queueId} ${action}`, 'AbortError'),
  );
  if (shouldRenew) state.lifecycleController = new AbortController();
};

const getRunSignal = <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
  signal?: AbortSignal,
): AbortSignal =>
  signal
    ? AbortSignal.any([state.lifecycleController.signal, signal])
    : state.lifecycleController.signal;

const hasActiveTasks = async <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
): Promise<boolean> => {
  if (state.handle.length === 0) return false;
  const tasks = await state.repository.getAll(state.queueId);
  return state.handle.length > 0 && tasks.some((task) => ACTIVE_TASK_STATUSES.has(task.status));
};

const pauseAndCancelTasks = async <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
): Promise<void> => {
  logger.warn(`PAUSE QUEUE: ${state.queueId}`);
  state.queue.pause();
  const tasks = await state.repository.getAll(state.queueId);
  const activeTasks = tasks.filter((task) => ACTIVE_TASK_STATUSES.has(task.status));
  await Promise.all(activeTasks.map((task) => cancelTask(state, task.id)));
};

const clearQueue = async <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
): Promise<void> => {
  abortWaiters(state, 'cleared', true);
  await pauseAndCancelTasks(state);
  await state.repository.clear(state.queueId);
  state.queue.resume();
};

const destroyQueue = <TPayload, TResult>(state: QueueRuntimeState<TPayload, TResult>): void => {
  abortWaiters(state, 'destroyed', false);
  state.queue.removeAllListeners();
  state.queue.destroy(() => null);
};

const updateTaskStatus = <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
  taskId: string,
  status: QueueTask['status'],
): Promise<void> =>
  state.repository.update(taskId, { status }).catch((error: unknown) => {
    logger.error('Failed to update queue task status', { error, status, taskId });
  });

const trackStatusUpdate = <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
  update: Promise<void>,
): void => {
  state.pendingStatusUpdates.add(update);
  void update.finally(() => state.pendingStatusUpdates.delete(update));
};

const registerStatusEvents = <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
): void => {
  state.queue.on('task_finish', (taskId: string) => {
    trackStatusUpdate(state, updateTaskStatus(state, taskId, 'completed'));
  });
  state.queue.on('task_failed', (taskId: string) => {
    trackStatusUpdate(state, updateTaskStatus(state, taskId, 'failed'));
  });
};

const waitForStatusUpdates = async <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
): Promise<void> => {
  await Promise.all([...state.pendingStatusUpdates]);
};

const runAndWaitForIdle = async <TPayload, TResult>(
  state: QueueRuntimeState<TPayload, TResult>,
  operation: QueueOperation,
  options: QueueRunOptions,
): Promise<void> => {
  const signal = getRunSignal(state, options.signal);
  const result = await to(() =>
    waitForQueueDrain(state.handle, operation, () => hasActiveTasks(state), {
      ...options,
      signal,
    }),
  )();
  if (result.isOk()) {
    await waitForStatusUpdates(state);
    return;
  }
  if (result.error instanceof QueueIdleTimeoutError) await clearQueue(state);
  throw result.error;
};

export const createQueueRuntime = <TPayload = unknown, TResult = unknown>(
  queueId: string,
  options: QueueCreationOptions<TPayload, TResult>,
  repository: QueueRepository,
): QueueRuntime<TPayload, TResult> => {
  const state = createRuntimeState(queueId, options, repository);
  registerStatusEvents(state);
  return {
    handle: state.handle,
    add: (payload, taskOptions) => addTask(state, payload, taskOptions),
    enqueueUnique: (payload) => enqueueUniqueTask(state, payload),
    cancel: (taskId) => cancelTask(state, taskId),
    clear: () => clearQueue(state),
    destroy: () => destroyQueue(state),
    getStats: () => ({ ...state.queue.getStats() }),
    pause: () => state.queue.pause(),
    resume: () => state.queue.resume(),
    runAndWaitForIdle: (operation, runOptions = {}) =>
      runAndWaitForIdle(state, operation, runOptions),
  };
};
