import { Document, type EnrichedDocumentSearchResults } from 'flexsearch';
import type { FileTask } from 'orgnote-api';

type AgendaTaskSearchFields = Pick<FileTask, 'text' | 'tags' | 'todoKeyword' | 'priority'>;

export type AgendaTaskSearchEntry = Readonly<AgendaTaskSearchFields> & {
  readonly searchId: string;
  readonly fileTitle: string;
  readonly filePath: string;
};

export const createAgendaTaskSearchId = (filePath: string, taskId: string): string =>
  `${filePath}\u0000${taskId}`;

export interface AgendaTaskSearchIndex {
  replace: (entries: readonly AgendaTaskSearchEntry[]) => void;
  search: (query: string) => string[];
}

interface IndexedAgendaTask {
  [key: string]: string;
  id: string;
  searchText: string;
  text: string;
  tags: string;
  fileTitle: string;
  filePath: string;
  todoKeyword: string;
  priority: string;
}

const createIndex = (): Document<IndexedAgendaTask> =>
  new Document<IndexedAgendaTask>({
    document: {
      id: 'id',
      index: ['searchText', 'text', 'tags', 'fileTitle', 'filePath', 'todoKeyword', 'priority'],
      store: ['id'],
    },
    tokenize: 'forward',
    cache: true,
    context: true,
  });

const toIndexedTask = (entry: AgendaTaskSearchEntry): IndexedAgendaTask => {
  const tags = entry.tags?.join(' ') ?? '';
  const todoKeyword = entry.todoKeyword ?? '';
  const priority = entry.priority ?? '';
  return {
    id: entry.searchId,
    searchText: [entry.text, tags, entry.fileTitle, entry.filePath, todoKeyword, priority].join(' '),
    text: entry.text,
    tags,
    fileTitle: entry.fileTitle,
    filePath: entry.filePath,
    todoKeyword,
    priority,
  };
};

const extractSearchIds = (results: EnrichedDocumentSearchResults<IndexedAgendaTask>): string[] => {
  const ids = new Set<string>();
  results.forEach((fieldResult) => {
    fieldResult.result.forEach((document) => ids.add(String(document.id)));
  });
  return [...ids];
};

export const createAgendaTaskSearchIndex = (): AgendaTaskSearchIndex => {
  let index = createIndex();

  const replace = (entries: readonly AgendaTaskSearchEntry[]): void => {
    index = createIndex();
    entries.forEach((entry) => index.add(toIndexedTask(entry)));
  };

  const search = (query: string): string[] => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    const results = index.search<false, false, true, true>(normalizedQuery, { enrich: true });
    return extractSearchIds(results);
  };

  return { replace, search };
};
