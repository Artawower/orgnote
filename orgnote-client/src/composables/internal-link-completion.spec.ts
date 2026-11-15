import { beforeEach, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import type {
  CompletionConfig,
  CompletionSearchResult,
  FileMeta,
  OrgNoteApi,
} from 'orgnote-api';
import { openInternalLinkCompletion } from './internal-link-completion';

const { reportError } = vi.hoisted(() => ({ reportError: vi.fn() }));

vi.mock('src/boot/report', () => ({ reporter: { reportError } }));

const files: FileMeta[] = [];
const lastSearchResult = ref<{
  files: FileMeta[];
  total: number;
  query: string;
} | null>(null);
const closeCompletion = vi.fn();
const fileInfo = vi.fn();
const insertInternalLink = vi.fn();
const saveFileMeta = vi.fn();
const writeFile = vi.fn();
let completionConfig: CompletionConfig<unknown> | undefined;
let completionResult: unknown;

const completion = {
  open: vi.fn(async (config: CompletionConfig<unknown>) => {
    completionConfig = config;
    return completionResult;
  }),
  close: closeCompletion,
};

const searchFiles = async (query: string, options?: { limit?: number; offset?: number }) => {
  const matches = files.filter((file) =>
    file.title?.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const offset = options?.offset ?? 0;
  const result = matches.slice(offset, offset + (options?.limit ?? 20));
  lastSearchResult.value = { files: result, total: matches.length, query };
  return result;
};

const api = {
  core: {
    useCompletion: () => completion,
    useEditor: () => ({ activeContext: { filePath: '/docs/current.org' } }),
    useFileSearch: () => ({ search: searchFiles, lastSearchResult }),
    useFileMeta: () => ({
      count: async () => files.length,
      getAll: async () => files,
      save: saveFileMeta,
    }),
    useFileSystem: () => ({ fileInfo, writeFile }),
  },
} as unknown as OrgNoteApi;

const editor = { insertInternalLink };

const getItems = async (
  query: string,
  limit: number = 20,
  offset: number = 0,
): Promise<CompletionSearchResult<unknown>> => {
  if (!completionConfig?.itemsGetter) throw new Error('Completion items getter is unavailable');
  return await completionConfig.itemsGetter(query, limit, offset);
};

beforeEach(() => {
  vi.clearAllMocks();
  files.length = 0;
  lastSearchResult.value = null;
  completionConfig = undefined;
  completionResult = undefined;
  fileInfo.mockResolvedValue(undefined);
});

test('internal link completion offers exact title creation with fuzzy matches', async () => {
  files.push({ id: '1', filePath: ['atlas.org'], title: 'Project Atlas' });
  await openInternalLinkCompletion(api, editor);

  const result = await getItems('Project');

  expect(result.result.map((candidate) => candidate.title)).toEqual([
    'Create note “Project”',
    'Project Atlas',
  ]);
  const createCandidate = result.result[0]!;
  createCandidate.commandHandler(createCandidate.data);
  expect(closeCompletion).toHaveBeenCalledWith({ kind: 'create', title: 'Project' });
});

test('internal link completion hides creation when target file exists', async () => {
  files.push({ id: '1', filePath: ['Project Atlas.org'], title: 'Project Atlas' });
  fileInfo.mockResolvedValue({ type: 'file' });
  await openInternalLinkCompletion(api, editor);

  const result = await getItems('Project Atlas');

  expect(result.result.map((candidate) => candidate.title)).toEqual(['Project Atlas']);
  expect(result.total).toBe(1);
});

test('internal link completion keeps creation candidate pagination aligned', async () => {
  files.push(
    ...Array.from({ length: 25 }, (_, index) => ({
      id: `${index}`,
      filePath: [`project-${index}.org`],
      title: `Project ${index}`,
    })),
  );
  await openInternalLinkCompletion(api, editor);

  const firstPage = await getItems('Project');
  const secondPage = await getItems('Project', 20, 20);

  expect(firstPage.result).toHaveLength(20);
  expect(secondPage.result[0]?.title).toBe('Project 19');
  expect(firstPage.total).toBe(26);
  expect(secondPage.total).toBe(26);
});

test('internal link completion creates and inserts an exact-title note', async () => {
  completionResult = { kind: 'create', title: 'Project Apollo' };

  await openInternalLinkCompletion(api, editor);

  expect(writeFile).toHaveBeenCalledWith(
    '/docs/Project Apollo.org',
    expect.stringContaining('#+TITLE: Project Apollo'),
  );
  expect(saveFileMeta).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Project Apollo', filePath: ['docs', 'Project Apollo.org'] }),
  );
  const createdId = saveFileMeta.mock.calls[0]?.[0]?.id as string;
  expect(insertInternalLink).toHaveBeenCalledWith(createdId, 'Project Apollo');
});

test('internal link completion does not overwrite a conflicting file', async () => {
  completionResult = { kind: 'create', title: 'Project Apollo' };
  fileInfo.mockResolvedValue({ type: 'file' });

  await openInternalLinkCompletion(api, editor);

  expect(writeFile).not.toHaveBeenCalled();
  expect(saveFileMeta).not.toHaveBeenCalled();
  expect(insertInternalLink).not.toHaveBeenCalled();
  expect(reportError).toHaveBeenCalledOnce();
});

test('internal link completion skips link insertion when creation fails', async () => {
  completionResult = { kind: 'create', title: 'Project Apollo' };
  writeFile.mockRejectedValue(new Error('Disk full'));

  await openInternalLinkCompletion(api, editor);

  expect(saveFileMeta).not.toHaveBeenCalled();
  expect(insertInternalLink).not.toHaveBeenCalled();
  expect(reportError).toHaveBeenCalledOnce();
});
