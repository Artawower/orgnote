import { defineStore } from 'pinia';
import type { OrgNoteWorkerContract, WorkerStore } from 'orgnote-api';
import { createWorkerHandle } from 'src/workers/create-worker-handle';
import { orgNoteCoreApi } from 'src/api/orgnote-core-api';
import { createRegisteredWorker } from 'src/workers/worker-registry';

export const useWorkerStore = defineStore<'worker', WorkerStore>('worker', () => {
  const spawn: WorkerStore['spawn'] = async <TContract extends OrgNoteWorkerContract>(
    workerId: string,
    options?: Parameters<WorkerStore['spawn']>[1],
  ) => {
    const registered = await createRegisteredWorker(workerId, options);
    const handle = createWorkerHandle<TContract>(
      registered.endpoint,
      registered.coreApi ?? orgNoteCoreApi,
    );
    return registered.manage(handle);
  };

  return { spawn };
});
