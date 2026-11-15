import { OrgNoteApi } from 'src/api';
import { Platform } from './platform';

export type PeriodicTaskStatus = 'active' | 'paused' | 'stopped';

export type PeriodicTaskRunResult = 'success' | 'error' | 'skipped';

export interface BaseCronTaskConfig {
  id: string;
  handler: (api: OrgNoteApi) => Promise<void> | void;
  runImmediately?: boolean;
  catchUpOnResume?: boolean;
  /** Default 1 **/
  maxCatchUpRuns?: number;
  /** Default true **/
  preventOverrun?: boolean;
  /** Default 30000 ms per task, when maximum time is exceeded, the task is considered failed **/
  timeout?: number;
  runWhen?: (api: OrgNoteApi) => Promise<boolean>;
  platforms?: Platform[];
}

export interface IntervalCronTask extends BaseCronTaskConfig {
  interval: number;
}

export interface CronExpressionTask extends BaseCronTaskConfig {
  cron: string;
}

export type CronTaskConfig = IntervalCronTask | CronExpressionTask;

export type CronTask = CronTaskConfig & {
  status: PeriodicTaskStatus;
  lastRun?: number;
  nextRun?: number;
};
