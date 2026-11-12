import { expect, test } from 'vitest';
import type { FileMeta } from 'orgnote-api';
import {
  buildAgendaFileFilterOptions,
  buildAgendaTaskGroups,
  isAgendaEligible,
} from './use-agenda-tasks';

type FileTask = NonNullable<FileMeta['tasks']>[number];

const baseTask = (kind: FileTask['kind']): FileTask => ({
  id: '1',
  kind,
  state: 'todo',
  text: 'Task',
});

test('isAgendaEligible_acceptsHeadlineTodo', () => {
  expect(isAgendaEligible(baseTask('headline-todo'))).toBe(true);
});

test('isAgendaEligible_acceptsHeadlineCheckbox', () => {
  expect(isAgendaEligible(baseTask('headline-checkbox'))).toBe(true);
});

test('isAgendaEligible_rejectsListCheckbox', () => {
  expect(isAgendaEligible(baseTask('list-checkbox'))).toBe(false);
});

test('buildAgendaTaskGroups filters tasks by an inclusive custom date range', () => {
  const files: FileMeta[] = [
    {
      id: 'work',
      filePath: ['agenda', 'work.org'],
      title: 'Work',
      tasks: [
        {
          ...baseTask('headline-todo'),
          id: 'first',
          scheduled: { date: '2026-05-15', active: true, hasTime: false, start: 0, end: 0 },
        },
        {
          ...baseTask('headline-todo'),
          id: 'second',
          scheduled: { date: '2026-05-17', active: true, hasTime: false, start: 0, end: 0 },
        },
      ],
    },
  ];

  const groups = buildAgendaTaskGroups(
    files,
    { dateFilter: { kind: 'range', from: '2026-05-14', to: '2026-05-16' } },
    new Date('2026-05-12T12:00:00'),
  );

  expect(groups[0]?.tasks.map((task) => task.id)).toEqual(['first']);
  expect(groups[0]?.tasks[0]?.viewDate.getDate()).toBe(15);
});

test('buildAgendaTaskGroups filters tasks by an exact day', () => {
  const files: FileMeta[] = [
    {
      id: 'work',
      filePath: ['agenda', 'work.org'],
      title: 'Work',
      tasks: [
        {
          ...baseTask('headline-todo'),
          id: 'selected',
          scheduled: { date: '2026-05-15', active: true, hasTime: false, start: 0, end: 0 },
        },
        {
          ...baseTask('headline-todo'),
          id: 'other',
          scheduled: { date: '2026-05-16', active: true, hasTime: false, start: 0, end: 0 },
        },
      ],
    },
  ];

  const groups = buildAgendaTaskGroups(
    files,
    { dateFilter: { kind: 'day', value: '2026-05-15' } },
    new Date('2026-05-12T12:00:00'),
  );

  expect(groups[0]?.tasks.map((task) => task.id)).toEqual(['selected']);
  expect(groups[0]?.tasks[0]?.viewDate.getDate()).toBe(15);
});

test('buildAgendaTaskGroups combines task search with an exact date range', () => {
  const files: FileMeta[] = [
    {
      id: 'work',
      filePath: ['agenda', 'work.org'],
      tasks: [
        {
          ...baseTask('headline-todo'),
          id: 'matching-text',
          scheduled: { date: '2026-05-18', active: true, hasTime: false, start: 0, end: 0 },
        },
      ],
    },
  ];

  const groups = buildAgendaTaskGroups(files, {
    dateFilter: { kind: 'range', from: '2026-05-14', to: '2026-05-16' },
    matchingTaskIds: ['/agenda/work.org\u0000matching-text'],
  });

  expect(groups).toEqual([]);
});

test('buildAgendaTaskGroups filters by exact file path while preserving date filters', () => {
  const files: FileMeta[] = [
    {
      id: 'work',
      filePath: ['agenda', 'work.org'],
      tasks: [{ ...baseTask('headline-todo'), id: 'work-task' }],
    },
    {
      id: 'home',
      filePath: ['agenda', 'home.org'],
      tasks: [{ ...baseTask('headline-todo'), id: 'home-task' }],
    },
  ];

  const groups = buildAgendaTaskGroups(files, {
    dateFilter: { kind: 'preset', value: 'all' },
    filePath: '/agenda/home.org',
  });

  expect(groups.map((group) => group.filePath)).toEqual(['/agenda/home.org']);
  expect(groups[0]?.tasks.map((task) => task.id)).toEqual(['home-task']);
});

test('buildAgendaFileFilterOptions includes only files with agenda tasks', () => {
  const options = buildAgendaFileFilterOptions([
    {
      id: 'work',
      filePath: ['agenda', 'work.org'],
      title: 'Work',
      tasks: [baseTask('headline-todo'), baseTask('headline-checkbox')],
    },
    {
      id: 'notes',
      filePath: ['agenda', 'notes.org'],
      title: 'Notes',
      tasks: [baseTask('list-checkbox')],
    },
  ]);

  expect(options).toEqual([
    {
      fileTitle: 'Work',
      filePath: '/agenda/work.org',
      taskCount: 2,
    },
  ]);
});

test('buildAgendaTaskGroups orders tasks by priority by default', () => {
  const files: FileMeta[] = [
    {
      id: 'work',
      filePath: ['agenda', 'work.org'],
      tasks: [
        { ...baseTask('headline-todo'), id: 'none' },
        { ...baseTask('headline-todo'), id: 'minimal', priority: 'E' },
        { ...baseTask('headline-todo'), id: 'low', priority: 'C' },
        { ...baseTask('headline-todo'), id: 'high-first', priority: 'A' },
        { ...baseTask('headline-todo'), id: 'medium', priority: 'B' },
        { ...baseTask('headline-todo'), id: 'high-second', priority: 'A' },
      ],
    },
  ];

  const groups = buildAgendaTaskGroups(files, {
    dateFilter: { kind: 'preset', value: 'all' },
  });

  expect(groups[0]?.tasks.map((task) => task.id)).toEqual([
    'high-first',
    'high-second',
    'medium',
    'low',
    'minimal',
    'none',
  ]);
});

test('buildAgendaTaskGroups preserves task search rank over priority order', () => {
  const files: FileMeta[] = [
    {
      id: 'work',
      filePath: ['agenda', 'work.org'],
      tasks: [
        { ...baseTask('headline-todo'), id: 'high', priority: 'A' },
        { ...baseTask('headline-todo'), id: 'low', priority: 'C' },
      ],
    },
  ];

  const groups = buildAgendaTaskGroups(files, {
    dateFilter: { kind: 'preset', value: 'all' },
    matchingTaskIds: ['/agenda/work.org\u0000low', '/agenda/work.org\u0000high'],
  });

  expect(groups[0]?.tasks.map((task) => task.id)).toEqual(['low', 'high']);
});

test('buildAgendaTaskGroups orders matching groups by task search rank', () => {
  const files: FileMeta[] = [
    {
      id: 'first-file',
      filePath: ['agenda', 'first.org'],
      tasks: [{ ...baseTask('headline-todo'), id: 'first' }],
    },
    {
      id: 'second-file',
      filePath: ['agenda', 'second.org'],
      tasks: [{ ...baseTask('headline-todo'), id: 'second' }],
    },
  ];

  const groups = buildAgendaTaskGroups(files, {
    dateFilter: { kind: 'preset', value: 'all' },
    matchingTaskIds: ['/agenda/second.org\u0000second', '/agenda/first.org\u0000first'],
  });

  expect(groups.map((group) => group.filePath)).toEqual([
    '/agenda/second.org',
    '/agenda/first.org',
  ]);
});
