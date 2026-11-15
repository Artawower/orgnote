import type {
  OrgNoteWorkerContract,
  OrgNoteWorkerHandle,
} from './worker-contract';
import type { StoreDefinition } from './store';

export interface WorkerSpawnOptions {
  readonly name?: string;
}

export interface WorkerStore {
  spawn<TContract extends OrgNoteWorkerContract>(
    workerId: string,
    options?: WorkerSpawnOptions
  ): Promise<OrgNoteWorkerHandle<TContract>>;
}

export type WorkerStoreDefinition = StoreDefinition<WorkerStore>;
