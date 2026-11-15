import type { Ref } from 'vue';
import type { QueueTask, DeduplicationStrategy } from './queue-task';
import type { StoreDefinition } from './store';

export interface QueueProcessTask<TPayload = unknown> {
  readonly id: string;
  readonly payload: TPayload;
}

export type ProcessCallback<TResult = unknown> = (err?: unknown, result?: TResult) => void;
export type ProcessFn<TPayload = unknown, TResult = unknown> = (
  task: QueueProcessTask<TPayload>,
  cb: ProcessCallback<TResult>,
) => void;

export interface QueueCreationOptions<TPayload = unknown, TResult = unknown> {
  concurrent?: number;
  maxRetries?: number;
  retryDelay?: number;
  maxTimeout?: number;
  batchSize?: number;
  batchDelay?: number;
  afterProcessDelay?: number;
  filo?: boolean;
  id?:
    | string
    | ((task: QueueProcessTask<TPayload>, cb: (err: unknown, id: string) => void) => void);
  cancelIfRunning?: boolean;
  autoResume?: boolean;
  failTaskOnProcessException?: boolean;
  process?: ProcessFn<TPayload, TResult>;
  deduplicationStrategy?: DeduplicationStrategy;
}

export interface QueueTaskOptions {
  id?: string;
  priority?: number;
  delay?: number;
  timeout?: number;
  [key: string]: unknown;
}

export interface QueueStats {
  total: number;
  average: number;
  successRate: number;
  peak: number;
}

export interface QueueEventMap<TPayload = unknown, TResult = unknown> {
  drain: [];
  task_failed: [taskId: string, error: unknown];
  task_finish: [taskId: string, result: TResult];
  task_queued: [taskId: string, task: QueueProcessTask<TPayload>];
  task_started: [taskId: string, task: QueueProcessTask<TPayload>];
}

export interface QueueHandle<TPayload = unknown, TResult = unknown> {
  readonly length: number;
  on<TEvent extends keyof QueueEventMap<TPayload, TResult>>(
    event: TEvent,
    listener: (...args: QueueEventMap<TPayload, TResult>[TEvent]) => void,
  ): void;
  removeListener<TEvent extends keyof QueueEventMap<TPayload, TResult>>(
    event: TEvent,
    listener: (...args: QueueEventMap<TPayload, TResult>[TEvent]) => void,
  ): void;
}

export interface QueueRunOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export type QueueOperation = (signal: AbortSignal) => Promise<void>;

export interface QueueStore {
  queueIds: Ref<string[]>;

  register<TPayload = unknown, TResult = unknown>(
    queueId: string,
    options?: QueueCreationOptions<TPayload, TResult>,
  ): QueueHandle<TPayload, TResult>;
  unregister(queueId: string): void;
  getQueue<TPayload = unknown, TResult = unknown>(
    queueId: string,
  ): QueueHandle<TPayload, TResult> | undefined;
  destroy(queueId: string): void;
  add<TPayload = unknown>(
    queueId: string,
    payload: TPayload,
    options?: QueueTaskOptions,
  ): Promise<string>;
  getAll(queueId: string): Promise<QueueTask[]>;
  get(taskId: string): Promise<QueueTask | undefined>;
  remove(queueId: string, taskId: string): Promise<void>;
  pause(queueId: string): void;
  resume(queueId: string): void;
  getStats(queueId: string): Promise<QueueStats>;
  clear(queueId: string): Promise<void>;
  runAndWaitForIdle(
    queueId: string,
    operation: QueueOperation,
    options?: QueueRunOptions,
  ): Promise<void>;
  executeBatchTasks<TPayload = unknown, TResult = unknown>(
    options: QueueCreationOptions<TPayload, TResult>,
    data: TPayload[],
  ): Promise<TResult[]>;
}

export type QueueStoreDefinition = StoreDefinition<QueueStore>;
