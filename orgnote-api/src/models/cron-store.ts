import { Ref } from 'vue';
import { StoreDefinition } from './store';
import { CronTask, CronTaskConfig, PeriodicTaskStatus } from './cron-task';

export type SchedulerStatus = 'running' | 'stopped' | 'error';

export interface CronStore {
  tasks: Ref<Record<string, CronTask>>;
  status: Ref<SchedulerStatus>;

  init: () => Promise<void>;

  cleanup: () => Promise<void>;
  get: (id: string) => CronTask | undefined;
  pause: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  stop: (id: string) => Promise<void>;
  runImmediately: (id: string) => Promise<void>;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  getByStatus: (status: PeriodicTaskStatus) => CronTask[];

  register: (task: CronTaskConfig) => Promise<CronTask>;
  unregister: (id: string) => Promise<void>;
}

export type CronStoreDefinition = StoreDefinition<CronStore>;
