import { expect, test } from 'vitest';
import type { AgendaTaskGroup, AgendaTaskView } from '../composables/use-agenda-tasks';
import { buildAgendaTaskRows } from './agenda-task-rows';

const createTask = (id: string, filePath: string): AgendaTaskView => ({
  id,
  kind: 'headline-todo',
  state: 'todo',
  text: id,
  filePath,
  viewDate: new Date('2026-07-16'),
});

const inbox: AgendaTaskGroup = {
  fileTitle: 'Inbox',
  filePath: '/inbox.org',
  tasks: [createTask('first', '/inbox.org'), createTask('second', '/inbox.org')],
};

const project: AgendaTaskGroup = {
  fileTitle: 'Project',
  filePath: '/project.org',
  tasks: [createTask('third', '/project.org')],
};

const describeRows = (rows: ReturnType<typeof buildAgendaTaskRows>) =>
  rows.map((row) => (row.kind === 'group' ? `group:${row.filePath}` : `task:${row.task.id}`));

test('buildAgendaTaskRows lists each group header followed by its tasks', () => {
  const rows = buildAgendaTaskRows([inbox, project], () => true);

  expect(describeRows(rows)).toEqual([
    'group:/inbox.org',
    'task:first',
    'task:second',
    'group:/project.org',
    'task:third',
  ]);
});

test('buildAgendaTaskRows hides the tasks of collapsed groups', () => {
  const rows = buildAgendaTaskRows([inbox, project], (filePath) => filePath !== '/inbox.org');

  expect(describeRows(rows)).toEqual(['group:/inbox.org', 'group:/project.org', 'task:third']);
});

test('buildAgendaTaskRows marks the rows that close a group', () => {
  const rows = buildAgendaTaskRows([inbox, project], (filePath) => filePath !== '/project.org');

  expect(rows.map((row) => row.isGroupEnd)).toEqual([false, false, true, true]);
});

test('buildAgendaTaskRows gives every row a unique stable key', () => {
  const rows = buildAgendaTaskRows([inbox, project], () => true);
  const keys = rows.map((row) => row.key);

  expect(new Set(keys).size).toBe(keys.length);
  expect(keys).toEqual(buildAgendaTaskRows([inbox, project], () => true).map((row) => row.key));
});

test('buildAgendaTaskRows returns no rows without groups', () => {
  expect(buildAgendaTaskRows([], () => true)).toEqual([]);
});
