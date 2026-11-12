import type { QueueTask } from 'orgnote-api';
import { to } from 'orgnote-api/utils';

export const tasksToReport = (tasks: QueueTask[]): string => {
  const safeStringify = to(() => JSON.stringify(tasks, null, 2));
  const result = safeStringify();
  if (result.isOk()) return result.value;
  return '[]';
};
