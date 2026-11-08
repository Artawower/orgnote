import type { Ref } from 'vue';
import { StoreDefinition } from './store.js';
import { LogRecord, LogLevel } from './log.js';

export interface LogStore {
  logs: Ref<LogRecord[]>;

  addLog: (log: LogRecord) => void;
  addLogs: (logs: LogRecord[]) => void;
  getLogsByLevel: (level: LogLevel) => LogRecord[];
  getLogsSince: (timestamp: Date) => LogRecord[];
  getCountByLevel: (level: LogLevel) => number;
  clearLogs: () => void;
  clearLogsByLevel: (level: LogLevel) => void;
  exportAsText: () => string;
}

export type LogStoreDefinition = StoreDefinition<LogStore>;
