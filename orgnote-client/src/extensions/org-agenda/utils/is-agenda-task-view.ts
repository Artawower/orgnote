import type { AgendaTaskView } from '../composables/use-agenda-tasks';

export const isAgendaTaskView = (data: unknown): data is AgendaTaskView =>
  !!data &&
  typeof data === 'object' &&
  typeof (data as AgendaTaskView).filePath === 'string' &&
  typeof (data as AgendaTaskView).id === 'string';
