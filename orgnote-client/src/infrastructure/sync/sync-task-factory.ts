import type Queue from 'better-queue';
import type { SyncPlan } from 'orgnote-api';
import { SyncOperationType } from 'orgnote-api';
import { runWithConcurrency } from 'orgnote-api/utils';
import { toRaw } from 'vue';
import { useQueueStore } from 'src/stores/queue';
import type { SyncQueueTask } from 'src/models/sync-queue-task';
import { SYNC_QUEUE_ID } from 'src/constants/queue-ids';
import { waitForAddedTasks } from './sync-queue-completion';

const SYNC_TASK_INSERT_CONCURRENCY = 25;

const createSyncTasks = (plan: SyncPlan): SyncQueueTask[] => [
  ...plan.toUpload.map((data) => ({
    type: SyncOperationType.Upload,
    data: toRaw(data),
    serverTime: plan.serverTime,
  })),
  ...plan.toDownload.map((data) => ({
    type: SyncOperationType.Download,
    data: toRaw(data),
    serverTime: plan.serverTime,
  })),
  ...plan.toDeleteLocal.map((data) => ({
    type: SyncOperationType.DeleteLocal,
    data: toRaw(data),
    serverTime: plan.serverTime,
  })),
  ...plan.toDeleteRemote.map((data) => ({
    type: SyncOperationType.DeleteRemote,
    data: toRaw(data),
    serverTime: plan.serverTime,
  })),
];

const addTasks = (tasks: SyncQueueTask[]): Promise<string[]> => {
  const queueStore = useQueueStore();
  return runWithConcurrency(tasks, SYNC_TASK_INSERT_CONCURRENCY, (task) =>
    queueStore.add(SYNC_QUEUE_ID, task)
  );
};

export const enqueuePlanOperations = async (plan: SyncPlan): Promise<number> => {
  const tasks = createSyncTasks(plan);
  if (tasks.length === 0) return 0;

  const queue = useQueueStore().getQueue(SYNC_QUEUE_ID) as Queue | undefined;
  if (queue) await waitForAddedTasks(queue, () => addTasks(tasks));
  if (!queue) await addTasks(tasks);

  return tasks.length;
};

export const isPlanEmpty = (plan: SyncPlan): boolean =>
  plan.toUpload.length === 0 &&
  plan.toDownload.length === 0 &&
  plan.toDeleteLocal.length === 0 &&
  plan.toDeleteRemote.length === 0;
