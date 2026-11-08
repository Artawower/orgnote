import { expect, test } from 'vitest';
import {
  createAgendaTaskSearchIndex,
  type AgendaTaskSearchEntry,
} from './agenda-task-search-index';

const TASKS: AgendaTaskSearchEntry[] = [
  {
    searchId: '/agenda/work.org\u0000task-1',
    text: 'Prepare quarterly review',
    tags: ['work'],
    fileTitle: 'Work projects',
    filePath: '/agenda/work.org',
    todoKeyword: 'TODO',
    priority: 'A',
  },
  {
    searchId: '/agenda/home.org\u0000task-2',
    text: 'Buy groceries',
    tags: ['errands'],
    fileTitle: 'Home',
    filePath: '/agenda/home.org',
    todoKeyword: 'NEXT',
    priority: undefined,
  },
];

test('AgendaTaskSearchIndex finds tasks by title', () => {
  const searchIndex = createAgendaTaskSearchIndex();
  searchIndex.replace(TASKS);

  expect(searchIndex.search('quarter')).toEqual(['/agenda/work.org\u0000task-1']);
  expect(searchIndex.search('QUARTER')).toEqual(['/agenda/work.org\u0000task-1']);
  expect(searchIndex.search('   ')).toEqual([]);
});

test('AgendaTaskSearchIndex finds tasks by tags and file metadata', () => {
  const searchIndex = createAgendaTaskSearchIndex();
  searchIndex.replace(TASKS);

  expect(searchIndex.search('errand')).toEqual(['/agenda/home.org\u0000task-2']);
  expect(searchIndex.search('projects')).toEqual(['/agenda/work.org\u0000task-1']);
});

test('AgendaTaskSearchIndex matches query terms across task fields', () => {
  const searchIndex = createAgendaTaskSearchIndex();
  searchIndex.replace(TASKS);

  expect(searchIndex.search('quarter work')).toEqual(['/agenda/work.org\u0000task-1']);
  expect(searchIndex.search('quarter groceries')).toEqual([]);
});

test('AgendaTaskSearchIndex replaces stale task documents', () => {
  const searchIndex = createAgendaTaskSearchIndex();
  searchIndex.replace(TASKS);
  searchIndex.replace([TASKS[1]!]);

  expect(searchIndex.search('quarter')).toEqual([]);
  expect(searchIndex.search('grocer')).toEqual(['/agenda/home.org\u0000task-2']);
});
