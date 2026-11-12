import { expect, test } from 'vitest';
import { parse, withMetaInfo } from 'org-mode-ast';
import { extractFileTasks } from './extract-file-tasks';

test('extractFileTasks_withNoTasks_returnsEmptyArray', () => {
  const content = '#+TITLE: Empty';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/empty.org');
  expect(tasks).toEqual([]);
});

test('extractFileTasks_withCheckboxes_extractsCorrectStates', () => {
  const content = '- [ ] Task 1\n- [X] Task 2\n- [ ] Task 3';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/checkboxes.org');

  expect(tasks).toHaveLength(3);
  expect(tasks.map((task) => task.kind)).toEqual([
    'list-checkbox',
    'list-checkbox',
    'list-checkbox',
  ]);
  expect(tasks.map((task) => task.state)).toEqual(['todo', 'done', 'todo']);
  expect(tasks.map((task) => task.text)).toEqual(['Task 1', 'Task 2', 'Task 3']);
});

test('extractFileTasks_withKeywords_extractsTodos', () => {
  const content = '* [ ] This is headline task\n*** [X] Another one done\n* DONE This is done task';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/headlines.org');

  expect(tasks).toHaveLength(3);
  expect(tasks.map((task) => task.kind)).toEqual([
    'headline-checkbox',
    'headline-checkbox',
    'headline-todo',
  ]);
  expect(tasks.map((task) => task.state)).toEqual(['todo', 'done', 'done']);
  expect(tasks.map((task) => task.text)).toEqual([
    'This is headline task',
    'Another one done',
    'This is done task',
  ]);
});

test('extractFileTasks_withPriorityAndTags_extractsAgendaFields', () => {
  const content = '* TODO [#A] My task :work:home:';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/agenda.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.priority).toBe('A');
  expect(tasks[0]!.tags).toEqual(['work', 'home']);
  expect(tasks[0]!.todoKeyword).toBe('TODO');
  expect(tasks[0]!.text).toBe('My task');
});

test('extractFileTasks_withScheduledAndDeadline_extractsPlanningDates', () => {
  const content = '* TODO Task\nSCHEDULED: <2026-05-12 Mon> DEADLINE: <2026-05-20 Tue>';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/planning.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.scheduled?.date).toBe('2026-05-12');
  expect(tasks[0]!.deadline?.date).toBe('2026-05-20');
});

test('extractFileTasks_withHabitProperty_setsIsHabit', () => {
  const content =
    '* TODO Meditate\nSCHEDULED: <2026-05-12 Mon .+1d>\n:PROPERTIES:\n:STYLE: habit\n:END:';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/habits.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.isHabit).toBe(true);
});

test('extractFileTasks_withClockInLogbook_extractsClocks', () => {
  const content =
    '* TODO Task\n:LOGBOOK:\nCLOCK: [2026-05-11 Mon 10:00]--[2026-05-11 Mon 10:45] =>  0:45\n:END:';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/clocks.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.clocks).toHaveLength(1);
  expect(tasks[0]!.clocks![0]!.date).toContain('2026-05-11');
});

test('extractFileTasks_withClosedDate_extractsClosed', () => {
  const content = '* DONE Task\nCLOSED: [2026-05-10 Sun 22:00]';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/closed.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.closed?.date).toContain('2026-05-10');
});

test('extractFileTasks_withDoneLogbookEntry_extractsLastDoneAt', () => {
  const content =
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 14:30]\n:END:\n';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/done-log.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.lastDoneAt).toBe('2026-05-13');
});

test('extractFileTasks_withoutLogbook_hasNoLastDoneAt', () => {
  const content = '* TODO Task\nBody\n';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/no-log.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.lastDoneAt).toBeUndefined();
});

test('extractFileTasks_withLogbookWithoutDone_hasNoLastDoneAt', () => {
  const content =
    '* TODO Task\n:LOGBOOK:\n- State "TODO" from "DONE" [2026-05-13 Wed 14:30]\n:END:\n';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/todo-log.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.lastDoneAt).toBeUndefined();
});

test('extractFileTasks_withMultipleDoneLogbookEntries_extractsLatestDoneAt', () => {
  const content =
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-12 Tue 09:00]\n- State "DONE" from "TODO" [2026-05-14 Thu 10:00]\n:END:\n';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/multi-log.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.lastDoneAt).toBe('2026-05-14');
});

test('extractFileTasks_levelTwoTaskWithTagsAndMultipleLogbookEntries_parsesLastDoneAt', () => {
  const content = `* Parent
** TODO 10 minutes of silent                                          :live:
SCHEDULED: <2026-05-16 Sat +1d>
:LOGBOOK:
- State "DONE" from "TODO" [2026-05-14 Thu 03:19]
- State "DONE" from "TODO" [2026-05-14 Thu 03:18]
- State "DONE" from "TODO" [2026-05-13 Wed 22:00]
:END:
`;
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/real-log.org');
  const silentTask = tasks.find((task) => task.text.includes('10 minutes'));

  expect(silentTask).toBeDefined();
  expect(silentTask?.lastDoneAt).toBe('2026-05-14');
});

test('extractFileTasks_taskWithoutParent_parsesLogbook', () => {
  const content = `* TODO Daily
SCHEDULED: <2026-05-14 Thu +1d>
:LOGBOOK:
- State "DONE" from "TODO" [2026-05-14 Thu 12:00]
:END:
`;
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/root-log.org');

  expect(tasks[0]?.lastDoneAt).toBe('2026-05-14');
});

test('extractFileTasks_levelTwoTaskWithoutTags_parsesLogbook', () => {
  const content = `* Parent
** TODO Subtask
:LOGBOOK:
- State "DONE" from "TODO" [2026-05-14 Thu 12:00]
:END:
`;
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/subtask-log.org');
  const subtask = tasks.find((task) => task.text.includes('Subtask'));

  expect(subtask?.lastDoneAt).toBe('2026-05-14');
});

test('extractFileTasks_logbookMultipleDoneEntries_returnsAllDoneDates', () => {
  const content = `* TODO Daily
:LOGBOOK:
- State "DONE" from "TODO" [2026-05-14 Thu 10:00]
- State "DONE" from "TODO" [2026-05-12 Tue 09:00]
:END:
`;
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/done-dates.org');

  expect(tasks[0]?.doneDates).toContain('2026-05-14');
  expect(tasks[0]?.doneDates).toContain('2026-05-12');
  expect(tasks[0]?.doneDates).toHaveLength(2);
});

test('extractFileTasks_noLogbook_doneDatesEmpty', () => {
  const content = '* TODO Task\n';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/empty-done-dates.org');

  expect(tasks[0]?.doneDates ?? []).toEqual([]);
});

test('extractFileTasks_listCheckbox_hasNoAgendaFields', () => {
  const content = '- [ ] Simple list task';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/list.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.kind).toBe('list-checkbox');
  expect(tasks[0]!.scheduled).toBeUndefined();
  expect(tasks[0]!.deadline).toBeUndefined();
  expect(tasks[0]!.clocks).toBeUndefined();
  expect(tasks[0]!.isHabit).toBeUndefined();
  expect(tasks[0]!.todoKeyword).toBeUndefined();
  expect(tasks[0]!.priority).toBeUndefined();
});

test('extractFileTasks_setsStartEndOffsets', () => {
  const content = '- [ ] First\n- [ ] Middle\n- [ ] Last';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/lines.org');

  expect(tasks).toHaveLength(3);
  expect(tasks.map((task) => [task.start, task.end])).toEqual([
    [0, 12],
    [12, 25],
    [25, 35],
  ]);
});

test('extractFileTasks_headlineTaskStart_matchesHeadlineStart', () => {
  const content = '#+TITLE: Notes\n\n* TODO Headline task';
  const root = withMetaInfo(parse(content));
  const tasks = extractFileTasks(root, '/headline.org');

  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.start).toBe(content.indexOf('* TODO'));
});
