import { expect, test } from 'vitest';
import type { AgendaTaskView } from '../composables/use-agenda-tasks';
import { predictAgendaToggle } from './agenda-task-prediction';
import { isToday } from '../utils/agenda-filters';

const VIEW_DATE = new Date(2026, 4, 13);
const repeating = { date: '2026-05-13', repeater: '.+1d' } as unknown as AgendaTaskView['scheduled'];

const createTaskView = (overrides: Partial<AgendaTaskView> = {}): AgendaTaskView => ({
  id: 'task',
  kind: 'headline-todo',
  state: 'todo',
  text: 'Task',
  start: 0,
  filePath: '/work.org',
  viewDate: VIEW_DATE,
  ...overrides,
});

test('predictAgendaToggle completes a regular task on the viewed day', () => {
  expect(predictAgendaToggle(createTaskView({ doneDates: ['2026-05-01'] }))).toEqual({
    state: 'done',
    doneDates: ['2026-05-01', '2026-05-13'],
  });
});

test('predictAgendaToggle reopens a regular task keeping its completion history', () => {
  expect(predictAgendaToggle(createTaskView({ state: 'done' }))).toEqual({ state: 'todo' });
});

test('predictAgendaToggle marks a repeating task completed on the viewed day', () => {
  expect(predictAgendaToggle(createTaskView({ scheduled: repeating }))).toEqual({
    doneDates: ['2026-05-13'],
  });
});

test('predictAgendaToggle unmarks a repeating task already completed on the viewed day', () => {
  const task = createTaskView({ scheduled: repeating, doneDates: ['2026-05-12', '2026-05-13'] });

  expect(predictAgendaToggle(task)).toEqual({ doneDates: ['2026-05-12'] });
});

test('predictAgendaToggle keeps a completed overdue task in Today', () => {
  const overdue = createTaskView({ scheduled: { date: '2026-05-12' } as AgendaTaskView['scheduled'] });

  const predicted = { ...overdue, ...predictAgendaToggle(overdue) };

  expect(isToday(overdue, VIEW_DATE)).toBe(true);
  expect(isToday(predicted, VIEW_DATE)).toBe(true);
});

