import { expect, test } from 'vitest';
import type { FileMeta } from 'orgnote-api';
import { buildTaskDateMarkers, buildTasksTree } from './task-tree';

test('buildTasksTree groups tasks by file and filters files without tasks', () => {
  const files: FileMeta[] = [
    {
      id: 'no-tasks',
      filePath: ['notes', 'empty.org'],
      title: 'Empty',
      tasks: [],
    },
    {
      id: 'with-tasks',
      filePath: ['notes', 'tasks.org'],
      title: 'Tasks',
      updatedAt: '2025-01-02T10:00:00.000Z',
      tasks: [
        {
          id: 'task-2',
          kind: 'list-checkbox',
          state: 'done',
          text: 'Second',
          start: 20,
          end: 30,
        },
        {
          id: 'task-1',
          kind: 'headline-todo',
          state: 'todo',
          text: 'First',
          start: 10,
          end: 19,
        },
      ],
    },
  ];

  const tree = buildTasksTree(files);

  expect(tree).toHaveLength(1);
  expect(tree[0]?.kind).toBe('file');
  expect(tree[0]?.label).toBe('Tasks');
  expect(tree[0]?.filePath).toBe('/notes/tasks.org');
  expect(tree[0]?.children?.map((node) => node.id)).toEqual(['task-1', 'task-2']);
});

test('buildTasksTree uses file name when file title is missing', () => {
  const files: FileMeta[] = [
    {
      id: 'file-1',
      filePath: ['notes', 'project-tasks.org'],
      tasks: [
        {
          id: 'task-1',
          kind: 'headline-checkbox',
          state: 'todo',
          text: 'Task',
        },
      ],
    },
  ];

  const tree = buildTasksTree(files);

  expect(tree[0]?.label).toBe('project-tasks');
});

test('buildTasksTree keeps task label empty when task text is blank', () => {
  const files: FileMeta[] = [
    {
      id: 'file-1',
      filePath: ['notes', 'tasks.org'],
      title: 'Tasks',
      tasks: [
        {
          id: 'task-1',
          kind: 'headline-checkbox',
          state: 'todo',
          text: '   ',
        },
      ],
    },
  ];

  const tree = buildTasksTree(files);

  expect(tree[0]?.children?.[0]?.label).toBe('');
});

test('buildTasksTree sorts files by updatedAt descending', () => {
  const files: FileMeta[] = [
    {
      id: 'old-file',
      filePath: ['notes', 'old.org'],
      title: 'Old',
      updatedAt: '2024-01-01T00:00:00.000Z',
      tasks: [{ id: 'task-1', kind: 'headline-todo', state: 'todo', text: 'Old task' }],
    },
    {
      id: 'new-file',
      filePath: ['notes', 'new.org'],
      title: 'New',
      updatedAt: '2025-01-01T00:00:00.000Z',
      tasks: [{ id: 'task-2', kind: 'headline-todo', state: 'todo', text: 'New task' }],
    },
  ];

  const tree = buildTasksTree(files);

  expect(tree.map((node) => node.id)).toEqual(['file:new-file', 'file:old-file']);
});

test('buildTasksTree excludes completed tasks when requested', () => {
  const files: FileMeta[] = [
    {
      id: 'file-1',
      filePath: ['notes', 'tasks.org'],
      title: 'Tasks',
      tasks: [
        {
          id: 'task-done',
          kind: 'list-checkbox',
          state: 'done',
          text: 'Done task',
          start: 0,
          end: 10,
        },
        {
          id: 'task-todo',
          kind: 'list-checkbox',
          state: 'todo',
          text: 'Todo task',
          start: 11,
          end: 20,
        },
      ],
    },
  ];

  const tree = buildTasksTree(files, { includeCompletedTasks: false });

  expect(tree).toHaveLength(1);
  expect(tree[0]?.children?.map((node) => node.id)).toEqual(['task-todo']);
});

test('buildTasksTree filters files by today', () => {
  const now = new Date('2026-03-14T12:00:00');
  const files: FileMeta[] = [
    {
      id: 'today-file',
      filePath: ['notes', 'today.org'],
      title: 'Today',
      updatedAt: '2026-03-14T08:00:00',
      tasks: [{ id: 'task-1', kind: 'headline-todo', state: 'todo', text: 'Today task' }],
    },
    {
      id: 'old-file',
      filePath: ['notes', 'old.org'],
      title: 'Old',
      updatedAt: '2026-03-10T08:00:00',
      tasks: [{ id: 'task-2', kind: 'headline-todo', state: 'todo', text: 'Old task' }],
    },
  ];

  const tree = buildTasksTree(files, { updatedAtFilter: 'today', now });

  expect(tree.map((node) => node.id)).toEqual(['file:today-file']);
});

test('buildTasksTree filters files by yesterday', () => {
  const now = new Date('2026-03-14T12:00:00');
  const files: FileMeta[] = [
    {
      id: 'yesterday-file',
      filePath: ['notes', 'yesterday.org'],
      title: 'Yesterday',
      updatedAt: '2026-03-13T08:00:00',
      tasks: [{ id: 'task-1', kind: 'headline-todo', state: 'todo', text: 'Yesterday task' }],
    },
    {
      id: 'today-file',
      filePath: ['notes', 'today.org'],
      title: 'Today',
      updatedAt: '2026-03-14T08:00:00',
      tasks: [{ id: 'task-2', kind: 'headline-todo', state: 'todo', text: 'Today task' }],
    },
  ];

  const tree = buildTasksTree(files, { updatedAtFilter: 'yesterday', now });

  expect(tree.map((node) => node.id)).toEqual(['file:yesterday-file']);
});

test('buildTasksTree filters files by last month', () => {
  const now = new Date('2026-03-14T12:00:00');
  const files: FileMeta[] = [
    {
      id: 'recent-file',
      filePath: ['notes', 'recent.org'],
      title: 'Recent',
      updatedAt: '2026-03-01T08:00:00',
      tasks: [{ id: 'task-1', kind: 'headline-todo', state: 'todo', text: 'Recent task' }],
    },
    {
      id: 'stale-file',
      filePath: ['notes', 'stale.org'],
      title: 'Stale',
      updatedAt: '2026-01-01T08:00:00',
      tasks: [{ id: 'task-2', kind: 'headline-todo', state: 'todo', text: 'Stale task' }],
    },
  ];

  const tree = buildTasksTree(files, { updatedAtFilter: 'last-month', now });

  expect(tree.map((node) => node.id)).toEqual(['file:recent-file']);
});

test('buildTasksTree filters files by last week', () => {
  const now = new Date('2026-03-14T12:00:00');
  const files: FileMeta[] = [
    {
      id: 'recent-file',
      filePath: ['notes', 'recent.org'],
      title: 'Recent',
      updatedAt: '2026-03-12T08:00:00',
      tasks: [{ id: 'task-1', kind: 'headline-todo', state: 'todo', text: 'Recent task' }],
    },
    {
      id: 'older-file',
      filePath: ['notes', 'older.org'],
      title: 'Older',
      updatedAt: '2026-03-01T08:00:00',
      tasks: [{ id: 'task-2', kind: 'headline-todo', state: 'todo', text: 'Older task' }],
    },
  ];

  const tree = buildTasksTree(files, { updatedAtFilter: 'last-week', now });

  expect(tree.map((node) => node.id)).toEqual(['file:recent-file']);
});

test('buildTasksTree filters files by exact updatedAt calendar date', () => {
  const files: FileMeta[] = [
    {
      id: 'selected-file',
      filePath: ['notes', 'selected.org'],
      title: 'Selected',
      updatedAt: '2026-03-12T08:00:00',
      tasks: [{ id: 'task-1', kind: 'headline-todo', state: 'todo', text: 'Selected task' }],
    },
    {
      id: 'other-file',
      filePath: ['notes', 'other.org'],
      title: 'Other',
      updatedAt: '2026-03-13T08:00:00',
      tasks: [{ id: 'task-2', kind: 'headline-todo', state: 'todo', text: 'Other task' }],
    },
  ];

  const tree = buildTasksTree(files, { selectedUpdatedAtDate: '2026/03/12' });

  expect(tree.map((node) => node.id)).toEqual(['file:selected-file']);
});

test('buildTaskDateMarkers returns unique updatedAt dates with visible tasks', () => {
  const now = new Date('2026-03-14T12:00:00');
  const files: FileMeta[] = [
    {
      id: 'first',
      filePath: ['notes', 'first.org'],
      updatedAt: '2026-03-12T08:00:00',
      tasks: [{ id: 'task-1', kind: 'headline-todo', state: 'todo', text: 'Task 1' }],
    },
    {
      id: 'second',
      filePath: ['notes', 'second.org'],
      updatedAt: '2026-03-12T09:00:00',
      tasks: [{ id: 'task-2', kind: 'headline-todo', state: 'todo', text: 'Task 2' }],
    },
    {
      id: 'done-only',
      filePath: ['notes', 'done.org'],
      updatedAt: '2026-03-13T08:00:00',
      tasks: [{ id: 'task-3', kind: 'headline-todo', state: 'done', text: 'Done task' }],
    },
    {
      id: 'recent',
      filePath: ['notes', 'recent.org'],
      updatedAt: '2026-03-14T08:00:00',
      tasks: [{ id: 'task-4', kind: 'headline-todo', state: 'todo', text: 'Recent task' }],
    },
  ];

  const markers = buildTaskDateMarkers(files, {
    includeCompletedTasks: false,
    updatedAtFilter: 'last-week',
    now,
  });

  expect(markers).toEqual([
    { date: '2026/03/12', color: 'accent' },
    { date: '2026/03/14', color: 'accent' },
  ]);
});
