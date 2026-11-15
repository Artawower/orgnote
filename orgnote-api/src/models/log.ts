import { union, literal, type InferOutput } from 'valibot';

export const LOG_LEVEL_SCHEMA = union([
  literal('error'),
  literal('warn'),
  literal('info'),
  literal('debug'),
  literal('trace'),
]);

export type LogLevel = InferOutput<typeof LOG_LEVEL_SCHEMA>;

export interface LogRecord {
  id?: number;
  ts: Date;
  level: LogLevel;
  message: string;
  bindings?: Record<string, unknown>;
  context?: Record<string, unknown>;
  repeatCount?: number;
  firstTs?: Date;
  lastTs?: Date;
}
