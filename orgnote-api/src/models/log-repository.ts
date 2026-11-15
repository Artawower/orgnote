import { LogLevel, LogRecord } from './log';

export interface LogFilter {
  level?: LogLevel;
  from?: Date;
  to?: Date;
  text?: string;
  limit?: number;
  offset?: number;
}

export interface LoggerRepository {
  add(record: LogRecord): Promise<void>;
  bulkAdd(records: LogRecord[]): Promise<void>;
  query(filter: LogFilter): Promise<LogRecord[]>;
  count(filter?: Omit<LogFilter, 'limit' | 'offset'>): Promise<number>;
  clear(): Promise<void>;
  purgeOlderThan(date: Date): Promise<void>;
}
