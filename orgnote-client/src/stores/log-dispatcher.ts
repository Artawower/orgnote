import type { LogRecord, LoggerRepository } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { MAX_LOGS } from './log';
import type { UseLogStore } from './log';

const pendingRecords: LogRecord[] = [];
let logStore: UseLogStore | undefined;
let repository: LoggerRepository | undefined;

const queue: LogRecord[] = [];
const options = {
  batchSize: 25,
  flushIntervalMs: 2000,
  maxQueue: 5000,
  retentionDays: 14,
  maxRecords: 50000,
};

let timer: ReturnType<typeof setInterval> | null = null;

const schedule = (): void => {
  if (timer) return;
  timer = setInterval(() => void flush(), options.flushIntervalMs);
};

const enqueueForPersistence = (record: LogRecord): void => {
  queue.push(record);
  if (queue.length > options.maxQueue) queue.shift();
  if (!repository) return;
  if (queue.length < options.batchSize) return;
  void flush();
};

const flush = async (): Promise<void> => {
  if (!repository) return;
  if (queue.length === 0) return;
  const chunk = queue.splice(0, options.batchSize);
  const res = await to(repository.bulkAdd)(chunk);
  if (res.isErr()) {
    console.error('Failed to flush log records:', res.error);
  }
};

const clearOldRecords = async (): Promise<void> => {
  if (!repository) return;
  const retentionMs = options.retentionDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - retentionMs);
  const purge = await to(repository.purgeOlderThan)(cutoff);
  if (purge.isErr()) console.error('Failed to purge old log records:', purge.error);
};

const clearThreshold = async (): Promise<void> => {
  if (!repository) return;
  const cnt = await to(repository.count)();
  if (cnt.isErr()) {
    console.error('Failed to count log records:', cnt.error);
    return;
  }
  const excess = cnt.value - options.maxRecords;
  if (excess <= 0) return;
  const records = await to(repository.query)({ limit: excess, offset: 0 });
  if (records.isErr()) {
    console.error('Failed to query log records:', records.error);
    return;
  }
  if (records.value.length === 0) return;
  const last = records.value[records.value.length - 1]?.ts;
  if (!last) return;
  const threshold = new Date(last.getTime() + 1);
  await repository.purgeOlderThan(threshold);
};

const drain = async (): Promise<void> => {
  if (!repository) return;
  if (queue.length === 0) return;
  const chunk = queue.splice(0, options.batchSize);
  const res = await to(repository.bulkAdd)(chunk);
  if (res.isErr()) console.error('Failed to flush log records:', res.error);
};

export const submitLogRecord = (record: LogRecord): void => {
  record.repeatCount = record.repeatCount ?? 1;
  record.firstTs = record.firstTs ?? record.ts;
  record.lastTs = record.lastTs ?? record.ts;

  if (logStore) {
    logStore.addLog(record);
  } else {
    pendingRecords.push(record);
    if (pendingRecords.length > MAX_LOGS) pendingRecords.shift();
  }
  enqueueForPersistence(record);
};

export const initializeLogStore = (store: UseLogStore, records: LogRecord[]): void => {
  const stagedPending = pendingRecords.splice(0, pendingRecords.length);
  store.clearLogs();
  store.addLogs(records);
  stagedPending.forEach((record) => store.addLog(record));

  logStore = store;

  if (!pendingRecords.length) return;
  const lateRecords = pendingRecords.splice(0, pendingRecords.length);
  lateRecords.forEach((record) => logStore?.addLog(record));
};

export const stopDispatcher = (): void => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  void flush();
};

export const resetDispatcherState = (): void => {
  stopDispatcher();
  queue.length = 0;
  pendingRecords.length = 0;
  logStore = undefined;
  repository = undefined;
};

export const connectLogRepository = async (repo: LoggerRepository): Promise<void> => {
  repository = repo;
  schedule();
  await clearOldRecords();
  await clearThreshold();
  await drain();
};

if (import.meta.hot) {
  import.meta.hot.accept?.();
  import.meta.hot.dispose?.(() => stopDispatcher());
}
