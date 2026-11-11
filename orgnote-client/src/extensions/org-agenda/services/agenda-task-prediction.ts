import type { FileTask } from 'orgnote-api';
import type { AgendaTaskView } from '../composables/use-agenda-tasks';
import { hasRepeater } from '../utils/agenda-filters';

const padDatePart = (value: number): string => String(value).padStart(2, '0');

const toDayKey = (date: Date): string =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const predictRepeatingToggle = (task: AgendaTaskView): Partial<FileTask> => {
  const viewDay = toDayKey(task.viewDate);
  const doneDates = task.doneDates ?? [];
  const isDoneOnViewDay = doneDates.some((doneDate) => doneDate.startsWith(viewDay));
  return {
    doneDates: isDoneOnViewDay
      ? doneDates.filter((doneDate) => !doneDate.startsWith(viewDay))
      : [...doneDates, viewDay],
  };
};

export const predictAgendaToggle = (task: AgendaTaskView): Partial<FileTask> => {
  if (hasRepeater(task)) return predictRepeatingToggle(task);
  return { state: task.state === 'done' ? 'todo' : 'done' };
};
