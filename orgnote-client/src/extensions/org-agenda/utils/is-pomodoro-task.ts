import type { AgendaTask } from '../types';

export type PomodoroTaskData = AgendaTask;

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';

export const isPomodoroTaskData = (data: unknown): data is PomodoroTaskData =>
  isObject(data) &&
  typeof data.id === 'string' &&
  typeof data.filePath === 'string';