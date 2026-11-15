import type {
  FileMeta,
  OrgNoteApi,
  CompletionSearchResult,
  CompletionCandidate,
  CompletionItemRenderer,
} from 'orgnote-api';
import { I18N, join } from 'orgnote-api';
import { unref } from 'vue';
import NoteSearchCompletionItem from 'src/containers/NoteSearchCompletionItem.vue';

const noteSearchItemHeight = 96;

const getFileName = (filePath: string[]): string => filePath.at(-1) ?? 'Untitled';

export const formatFileDescription = (file: FileMeta): string => {
  const parts: string[] = [];

  if (file.description) {
    parts.push(file.description);
  }

  if (file.tags?.length) {
    parts.push(file.tags.map((t) => `#${t}`).join(' '));
  }

  return parts.join('\n');
};

export const createFileItemsGetter = <TCandidate = FileMeta>(
  api: OrgNoteApi,
  mapFile: (file: FileMeta) => CompletionCandidate<TCandidate>,
): ((
  filter: string,
  limit?: number,
  offset?: number,
) => Promise<CompletionSearchResult<TCandidate>>) => {
  const searchFiles = async (
    filter: string,
    limit?: number,
    offset?: number,
  ): Promise<CompletionSearchResult<TCandidate>> => {
    const fileSearch = api.core.useFileSearch();
    const files = await fileSearch.search(filter, { limit, offset });
    const lastResult = unref(fileSearch.lastSearchResult);
    const isMatchingQuery = lastResult?.query === filter;

    return {
      total: isMatchingQuery ? lastResult.total : files.length,
      result: files.map(mapFile),
    };
  };

  const getRecentFiles = async (
    limit?: number,
    offset?: number,
  ): Promise<CompletionSearchResult<TCandidate>> => {
    const fileMeta = api.core.useFileMeta();
    const [files, total] = await Promise.all([
      fileMeta.getAll({ limit, offset }),
      fileMeta.count(),
    ]);

    return { total, result: files.map(mapFile) };
  };

  return async (
    filter: string,
    limit?: number,
    offset?: number,
  ): Promise<CompletionSearchResult<TCandidate>> => {
    if (!filter.trim()) return getRecentFiles(limit, offset);
    return searchFiles(filter, limit, offset);
  };
};

export const useNoteSearchCompletion = async (
  api: OrgNoteApi,
  searchText: string = '',
): Promise<void> => {
  const completion = api.core.useCompletion();
  const bufferViewer = api.core.useBufferViewer();
  const config = api.core.useConfig().config;
  const showDetails = config.completion.showDetails;

  const mapFile = (file: FileMeta): CompletionCandidate<FileMeta> => ({
    icon: 'sym_o_description',
    title: file.title ?? getFileName(file.filePath),
    description: showDetails ? formatFileDescription(file) : undefined,
    data: file,
    commandHandler: () => {
      bufferViewer.open(join('/', ...file.filePath));
      completion.close();
    },
  });

  await completion.open<FileMeta, void>({
    type: 'choice',
    searchText,
    placeholder: I18N.SEARCH,
    itemHeight: showDetails ? noteSearchItemHeight : undefined,
    itemRenderer: showDetails
      ? (NoteSearchCompletionItem as unknown as CompletionItemRenderer<FileMeta>)
      : undefined,
    itemsGetter: createFileItemsGetter(api, mapFile),
  });
};
