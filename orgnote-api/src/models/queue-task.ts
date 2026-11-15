export type QueueStatus =
  | 'completed'
  | 'failed'
  | 'pending'
  | 'processing'
  | 'canceled';

export type DeduplicationStrategy = 'skip' | 'replace' | 'moveToEnd';

export interface QueueTask<T = unknown> {
  id: string;
  payload: T;
  queueId: string;
  added: number;
  priority?: number;
  started?: number;
  retries?: number;
  failed?: number;
  lockId?: string;
  status?: QueueStatus;
  deletedAt?: number;
  [key: string]: unknown;
}
