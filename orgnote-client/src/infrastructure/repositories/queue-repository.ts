import type Dexie from 'dexie';
import { withDexieRecovery } from './dexie-retry';
import { migrator } from './migrator';
import type { QueueTask, QueueRepository } from 'orgnote-api';

import { arrayToMap } from 'src/utils/array-to-map';

export const QUEUE_REPOSITORY_NAME = 'queue_tasks';

export const QUEUE_MIGRATIONS = migrator<QueueTask>()
  .v(1)
  .indexes('id, priority, added, started')
  .v(2)
  .indexes('id, priority, added, started, lockId')
  .v(3)
  .indexes('id, added, started, lockId')
  .build();

export const FINAL_STATUSES = ['completed', 'failed', 'canceled'] as const;
type FinalStatus = (typeof FINAL_STATUSES)[number];

const isFinalStatus = (status?: string): status is FinalStatus => {
  return !!status && FINAL_STATUSES.includes(status as FinalStatus);
};

export const createQueueRepository = (db: Dexie): QueueRepository => {
  const store = db.table<QueueTask, string>(QUEUE_REPOSITORY_NAME);

  const add = async (task: QueueTask): Promise<void> => {
    const normalized: QueueTask = {
      ...task,
      deletedAt: undefined,
      status: 'pending',
    };
    await store.put(normalized);
  };

  const get = async (id: string): Promise<QueueTask | undefined> => store.get(id);

  const getAll = async (queueId?: string): Promise<QueueTask[]> => {
    if (!queueId) {
      return await store
        .orderBy('added')
        .filter((task) => !task.deletedAt)
        .toArray();
    }
    return await store
      .orderBy('added')
      .filter((task) => task.queueId === queueId && !task.deletedAt)
      .toArray();
  };

  const update = async (id: string, updates: Partial<QueueTask>): Promise<void> => {
    await store.update(id, updates);
  };

  const del = async (id: string, force = false): Promise<void> => {
    if (force) {
      await store.delete(id);
      return;
    }

    const task = await store.get(id);
    if (!task) return;

    const newStatus = isFinalStatus(task.status) ? task.status : 'canceled';

    await store.update(id, {
      deletedAt: Date.now(),
      status: newStatus,
      lockId: undefined,
      started: undefined,
    });
  };

  const lock = async (id: string): Promise<void> => {
    const task = await store.get(id);
    if (!task || task.deletedAt) return;
    await store.update(id, { started: Date.now(), status: 'processing' });
  };

  const release = async (id: string): Promise<void> => {
    const task = await store.get(id);
    if (!task || task.deletedAt) return;

    if (isFinalStatus(task.status)) {
      await store.update(id, {
        started: undefined,
        lockId: undefined,
      });
      return;
    }

    await store.update(id, {
      started: undefined,
      lockId: undefined,
      status: 'pending',
    });
  };

  const takeFirstN = async (n: number, queueId: string): Promise<string> => {
    let lockId = '';

    await db.transaction('rw', store, async () => {
      const tasks = await store
        .orderBy('added')
        .filter(
          (task) =>
            !task.lockId &&
            !task.deletedAt &&
            task.queueId === queueId &&
            task.status === 'pending',
        )
        .limit(n)
        .toArray();

      if (tasks.length === 0) return;

      lockId = crypto.randomUUID();

      await store.bulkPut(
        tasks.map((t) => ({
          ...t,
          lockId,
          status: 'processing' as const,
          started: Date.now(),
        })),
      );
    });

    return lockId;
  };

  const clear = async (queueId: string): Promise<void> => {
    await store.filter((task) => task.queueId === queueId).delete();
  };

  const getLock = async (lockId: string): Promise<{ [id: string]: QueueTask } | undefined> => {
    const tasks = await store.where('lockId').equals(lockId).toArray();
    if (tasks.length === 0) return undefined;
    return arrayToMap(tasks);
  };

  const getRunningTasks = async (queueId: string): Promise<{ [id: string]: QueueTask }> => {
    const tasks = await store
      .filter((task) => Boolean(task.lockId) && !task.deletedAt && task.queueId === queueId)
      .toArray();
    return arrayToMap(tasks);
  };

  return withDexieRecovery(db, {
    add,
    get,
    getAll,
    delete: del,
    update,
    lock,
    release,
    takeFirstN,
    getLock,
    getRunningTasks,
    clear,
  });
};
