import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { LogRecord, LogLevel, LogStore } from 'orgnote-api';
import { isPresent, to } from 'orgnote-api/utils';
import { createLogSignature } from 'src/utils/log-signature';

export const MAX_LOGS = 500;
const AGGREGATION_WINDOW_MS = 30_000;
const LOG_SIGNATURE_TOKEN = Symbol('logSignature');

type InternalLogRecord = LogRecord & { [LOG_SIGNATURE_TOKEN]?: string };

const ensureDate = (value?: Date | string): Date => {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
};

const mergeRecord = (target: LogRecord, source: LogRecord): void => {
  const targetFirst = ensureDate(target.firstTs ?? target.ts);
  const targetLast = ensureDate(target.lastTs ?? target.ts);
  const sourceFirst = ensureDate(source.firstTs ?? source.ts);
  const sourceLast = ensureDate(source.lastTs ?? source.ts);
  target.repeatCount = (target.repeatCount ?? 1) + (source.repeatCount ?? 1);
  target.firstTs = new Date(Math.min(targetFirst.getTime(), sourceFirst.getTime()));
  target.lastTs = new Date(Math.max(targetLast.getTime(), sourceLast.getTime()));
};

const getSignature = (record: LogRecord): string => {
  const internal = record as InternalLogRecord;
  if (internal[LOG_SIGNATURE_TOKEN]) return internal[LOG_SIGNATURE_TOKEN]!;
  const signature = createLogSignature(record);
  internal[LOG_SIGNATURE_TOKEN] = signature;
  return signature;
};

const cloneLogRecord = (log: LogRecord): LogRecord => {
  const nextLog = { ...log };
  nextLog.ts = ensureDate(nextLog.ts);
  nextLog.repeatCount = nextLog.repeatCount ?? 1;
  nextLog.firstTs = ensureDate(nextLog.firstTs ?? nextLog.ts);
  nextLog.lastTs = ensureDate(nextLog.lastTs ?? nextLog.ts);
  delete (nextLog as InternalLogRecord)[LOG_SIGNATURE_TOKEN];
  return nextLog;
};

export const useLogStore = defineStore('log', (): LogStore => {
  const logs = ref<LogRecord[]>([]);
  const aggregateMap = new Map<string, LogRecord>();

  const registerAggregate = (record: LogRecord, signature?: string): void => {
    aggregateMap.set(signature ?? getSignature(record), record);
  };

  const unregisterAggregate = (record?: LogRecord): void => {
    if (!record) return;
    const internal = record as InternalLogRecord;
    const signature = internal[LOG_SIGNATURE_TOKEN];
    if (!signature) return;
    const current = aggregateMap.get(signature);
    if (current === record) aggregateMap.delete(signature);
    delete internal[LOG_SIGNATURE_TOKEN];
  };

  const canMerge = (existing: LogRecord | undefined, candidate: LogRecord): existing is LogRecord => {
    if (!existing) return false;
    if (existing.level !== candidate.level) return false;
    const existingLast = ensureDate(existing.lastTs ?? existing.ts);
    const candidateLast = ensureDate(candidate.lastTs ?? candidate.ts);
    return candidateLast.getTime() - existingLast.getTime() <= AGGREGATION_WINDOW_MS;
  };

  const insertLog = (log: LogRecord): void => {
    const nextLog = cloneLogRecord(log);
    const signature = getSignature(nextLog);
    const existing = aggregateMap.get(signature);
    if (canMerge(existing, nextLog)) {
      mergeRecord(existing, nextLog);
      moveToFront(existing);
      return;
    }

    logs.value.unshift(nextLog);
    registerAggregate(nextLog, signature);
    if (logs.value.length > MAX_LOGS) {
      const removed = logs.value.pop();
      unregisterAggregate(removed);
    }
  };

  const moveToFront = (record: LogRecord): void => {
    const index = logs.value.indexOf(record);
    if (index <= 0) return;
    logs.value.splice(index, 1);
    logs.value.unshift(record);
  };

  const addLog = (log: LogRecord): void => {
    insertLog(log);
  };

  const addLogs = (newLogs: LogRecord[]): void => {
    for (let index = newLogs.length - 1; index >= 0; index -= 1) {
      const entry = newLogs[index];
      if (!entry) continue;
      insertLog(entry);
    }
  };

  const getLogsByLevel = (level: LogLevel): LogRecord[] =>
    logs.value.filter((log) => log.level === level);

  const getLogsSince = (timestamp: Date): LogRecord[] =>
    logs.value.filter((log) => {
      const logDate = ensureDate(log.lastTs ?? log.ts);
      return logDate >= timestamp;
    });

  const getCountByLevel = (level: LogLevel): number =>
    logs.value.filter((log) => log.level === level).length;

  const clearLogs = (): void => {
    logs.value = [];
    aggregateMap.clear();
  };

  const clearLogsByLevel = (level: LogLevel): void => {
    for (let index = logs.value.length - 1; index >= 0; index -= 1) {
      const record = logs.value[index];
      if (!record) continue;
      if (record.level !== level) continue;
      logs.value.splice(index, 1);
      unregisterAggregate(record);
    }
  };

  const extractContext = (context?: Record<string, unknown>): Record<string, unknown> => {
    if (!context) return {};
    const contextCopy = { ...context };
    delete contextCopy.stack;
    delete contextCopy.cause;
    return contextCopy;
  };

  const formatTimestamp = (ts: Date | string | number): string => {
    const date = ts instanceof Date ? ts : new Date(ts);
    return date.toISOString();
  };

  const formatMessage = (message: unknown): string => {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    if (typeof message === 'object' && isPresent(message)) {
      const safeStringify = to(() => JSON.stringify(message, null, 2));
      const result = safeStringify();
      if (result.isOk()) return result.value;
      return String(message);
    }
    return String(message);
  };

  const formatStack = (context?: Record<string, unknown>): string | undefined => {
    if (!context?.stack) return undefined;
    return String(context.stack);
  };

  const formatContext = (context?: Record<string, unknown>): string | undefined => {
    const ctx = extractContext(context);
    if (Object.keys(ctx).length === 0) return undefined;
    return `Context: ${JSON.stringify(ctx, null, 2)}`;
  };

  const formatErrorRecord = (log: LogRecord, index: number, total: number): string => {
    const position = total - index;
    const timestamp = formatTimestamp(log.ts);
    const header = `[${position}] ${timestamp}`;

    const parts = [header, formatMessage(log.message)];

    if ((log.repeatCount ?? 1) > 1) {
      const lastOccurrence = formatTimestamp(log.lastTs ?? log.ts);
      parts.push(`Repeated ${log.repeatCount} times (last at ${lastOccurrence})`);
    }

    const stack = formatStack(log.context);
    if (stack) parts.push(stack);

    const context = formatContext(log.context);
    if (context) parts.push(context);

    return parts.join('\n');
  };

  const exportAsText = (): string => {
    const errorLogs = getLogsByLevel('error');
    if (errorLogs.length === 0) return '';

    return errorLogs
      .map((log, index) => formatErrorRecord(log, index, errorLogs.length))
      .join('\n---\n');
  };

  return {
    logs,
    addLog,
    addLogs,
    getLogsByLevel,
    getLogsSince,
    getCountByLevel,
    clearLogs,
    clearLogsByLevel,
    exportAsText,
  };
});

export type UseLogStore = ReturnType<typeof useLogStore>;
