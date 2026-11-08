import { ref } from 'vue';
import type {
  QueueCreationOptions,
  QueueHandle,
  QueueOperation,
  QueueRunOptions,
  QueueStats,
  QueueStore,
  QueueTask,
  QueueTaskOptions,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { logger } from 'src/boot/logger';
import { repositories } from 'src/boot/repositories';
import {
  createQueueRuntime,
  type QueueRuntime,
} from 'src/infrastructure/queue/better-queue-runtime';
import { executeBatchTasks as executeQueueBatchTasks } from 'src/infrastructure/queue/execute-batch-tasks';
import { INDEX_QUEUE_ID, SYNC_QUEUE_ID } from 'src/constants/queue-ids';
import { defineStorageBoundStore } from 'src/infrastructure/stores/storage-bound-store';

class QueueNotRegisteredError extends Error {
  constructor(queueId: string) {
    super(`Queue ${queueId} is not registered`);
    this.name = 'QueueNotRegisteredError';
  }
}

export const useQueueStore = defineStorageBoundStore<'queue', QueueStore>('queue', () => {
  const runtimes = new Map<string, QueueRuntime>();
  const queueIds = ref<string[]>([]);

  const addQueueId = (queueId: string): void => {
    if (queueIds.value.includes(queueId)) return;
    queueIds.value = [...queueIds.value, queueId];
  };

  const removeQueueId = (queueId: string): void => {
    queueIds.value = queueIds.value.filter((id) => id !== queueId);
  };

  const getRuntime = <TPayload = unknown, TResult = unknown>(
    queueId: string,
  ): QueueRuntime<TPayload, TResult> | undefined =>
    runtimes.get(queueId) as QueueRuntime<TPayload, TResult> | undefined;

  const register = <TPayload = unknown, TResult = unknown>(
    queueId: string,
    options: QueueCreationOptions<TPayload, TResult> = {},
  ): QueueHandle<TPayload, TResult> => {
    const existing = getRuntime<TPayload, TResult>(queueId);
    if (existing) {
      addQueueId(queueId);
      return existing.handle;
    }
    const runtime = createQueueRuntime(queueId, options, repositories.queueRepository);
    runtimes.set(queueId, runtime as QueueRuntime);
    addQueueId(queueId);
    return runtime.handle;
  };

  const ensureRuntime = <TPayload = unknown, TResult = unknown>(
    queueId: string,
  ): QueueRuntime<TPayload, TResult> => {
    const runtime = getRuntime<TPayload, TResult>(queueId);
    if (runtime) return runtime;
    register<TPayload, TResult>(queueId);
    return getRuntime<TPayload, TResult>(queueId) as QueueRuntime<TPayload, TResult>;
  };

  const getQueue = <TPayload = unknown, TResult = unknown>(
    queueId: string,
  ): QueueHandle<TPayload, TResult> | undefined => getRuntime<TPayload, TResult>(queueId)?.handle;

  const add = <TPayload = unknown>(
    queueId: string,
    payload: TPayload,
    options?: QueueTaskOptions,
  ): Promise<string> => ensureRuntime<TPayload>(queueId).add(payload, options);

  const get = (taskId: string): Promise<QueueTask | undefined> =>
    repositories.queueRepository.get(taskId);

  const getAll = (queueId: string): Promise<QueueTask[]> =>
    repositories.queueRepository.getAll(queueId);

  const remove = (queueId: string, taskId: string): Promise<void> =>
    ensureRuntime(queueId).cancel(taskId);

  const pause = (queueId: string): void => {
    ensureRuntime(queueId).pause();
  };

  const resume = (queueId: string): void => {
    ensureRuntime(queueId).resume();
  };

  const destroy = (queueId: string): void => {
    const runtime = getRuntime(queueId);
    if (!runtime) return;
    runtime.destroy();
    runtimes.delete(queueId);
    removeQueueId(queueId);
  };

  const clear = async (queueId: string): Promise<void> => {
    const runtime = getRuntime(queueId);
    if (runtime) {
      await runtime.clear();
      return;
    }
    await repositories?.queueRepository?.clear(queueId);
  };

  const getStats = async (queueId: string): Promise<QueueStats> =>
    ensureRuntime(queueId).getStats();

  const runAndWaitForIdle = async (
    queueId: string,
    operation: QueueOperation,
    options: QueueRunOptions = {},
  ): Promise<void> => {
    const runtime = getRuntime(queueId);
    if (!runtime) throw new QueueNotRegisteredError(queueId);
    await runtime.runAndWaitForIdle(operation, options);
  };

  const clearStoredBatchTasks = async (queueId: string): Promise<void> => {
    const result = await to(() => repositories.queueRepository.clear(queueId))();
    if (result.isOk()) return;
    logger.error('Failed to clear batch queue tasks', { error: result.error, queueId });
  };

  const executeBatchTasks = <TPayload = unknown, TResult = unknown>(
    options: QueueCreationOptions<TPayload, TResult>,
    data: TPayload[],
  ): Promise<TResult[]> =>
    executeQueueBatchTasks(options, data, {
      clearStoredTasks: (queueId) => {
        void clearStoredBatchTasks(queueId);
      },
      create: (queueId, queueOptions) => {
        destroy(queueId);
        register(queueId, queueOptions);
        return ensureRuntime(queueId);
      },
      destroy,
    });

  const $resetStorage = async (): Promise<void> => {
    await Promise.all([clear(INDEX_QUEUE_ID), clear(SYNC_QUEUE_ID)]);
  };

  return {
    register,
    unregister: destroy,
    getQueue,
    add,
    get,
    getAll,
    remove,
    pause,
    resume,
    destroy,
    clear,
    getStats,
    runAndWaitForIdle,
    queueIds,
    executeBatchTasks,
    $resetStorage,
  };
});
