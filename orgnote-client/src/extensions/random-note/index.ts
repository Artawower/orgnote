import { join, type Command, type Extension, type FileMeta, type OrgNoteApi } from 'orgnote-api';
import { unref } from 'vue';
import { getActiveFilePath } from 'src/utils/get-active-file-path';

const RANDOM_NOTE_COMMAND = 'random note';
const RANDOM_NOTE_BY_SEARCH_COMMAND = 'random note by search';

interface RandomNoteSession {
  lastSearchQuery?: string;
}

const getRandomOffset = (total: number): number => Math.floor(Math.random() * total);

const isSameFilePath = (file: FileMeta, filePath?: string): boolean => {
  if (!filePath) return false;
  const normalizedPath = filePath.split('/').filter(Boolean).join('/');
  return file.filePath.join('/') === normalizedPath;
};

type FileAtOffset = (offset: number) => Promise<FileMeta | undefined>;

const pickRandomFile = async (
  total: number,
  getFileAtOffset: FileAtOffset,
  excludedPath?: string,
): Promise<FileMeta | undefined> => {
  if (!total) return undefined;
  const firstOffset = getRandomOffset(total);
  const firstFile = await getFileAtOffset(firstOffset);
  if (!firstFile || !isSameFilePath(firstFile, excludedPath)) return firstFile;
  if (total === 1) return undefined;

  const availableOffset = getRandomOffset(total - 1);
  const nextOffset = availableOffset >= firstOffset ? availableOffset + 1 : availableOffset;
  return getFileAtOffset(nextOffset);
};

const openFile = (api: OrgNoteApi, file: FileMeta): void => {
  api.core.useBufferViewer().open(join('/', ...file.filePath));
};

const notifyUnavailable = (api: OrgNoteApi, message: string): void => {
  api.core.useNotifications().notify({ message, level: 'info' });
};

const openRandomNote = async (api: OrgNoteApi): Promise<void> => {
  const fileMeta = api.core.useFileMeta();
  const total = await fileMeta.count();
  const file = await pickRandomFile(
    total,
    async (offset) => (await fileMeta.getAll({ limit: 1, offset }))[0],
    getActiveFilePath(api),
  );
  if (!file) {
    notifyUnavailable(api, 'No notes available');
    return;
  }
  openFile(api, file);
};

const promptSearchQuery = async (
  api: OrgNoteApi,
  session: RandomNoteSession,
): Promise<string | undefined> => {
  const query = await api.core.useCompletion().open<string, string>({
    type: 'input',
    placeholder: 'Search notes for a random match',
    searchText: session.lastSearchQuery ?? '',
    validateInput: (value) =>
      value.trim()
        ? { valid: true }
        : { valid: false, message: 'Enter a search query' },
  });
  return query?.trim() || undefined;
};

const findRandomSearchMatch = async (
  api: OrgNoteApi,
  query: string,
): Promise<FileMeta | undefined> => {
  const fileSearch = api.core.useFileSearch();
  const initialFiles = await fileSearch.search(query, { limit: 1, offset: 0 });
  const result = unref(fileSearch.lastSearchResult);
  const total = result?.query === query ? result.total : initialFiles.length;

  return pickRandomFile(
    total,
    async (offset) =>
      offset === 0
        ? initialFiles[0]
        : (await fileSearch.search(query, { limit: 1, offset }))[0],
    getActiveFilePath(api),
  );
};

const openRandomNoteBySearch = async (
  api: OrgNoteApi,
  session: RandomNoteSession,
): Promise<void> => {
  const query = await promptSearchQuery(api, session);
  if (!query) return;

  const file = await findRandomSearchMatch(api, query);
  if (!file) {
    notifyUnavailable(api, 'No notes match the search query');
    return;
  }

  session.lastSearchQuery = query;
  openFile(api, file);
};

const createRandomNoteCommand = (): Command => ({
  command: RANDOM_NOTE_COMMAND,
  title: 'Random note',
  description: 'Open a random note',
  group: 'global',
  icon: 'sym_o_casino',
  interactive: true,
  handler: openRandomNote,
});

const createFilteredRandomNoteCommand = (session: RandomNoteSession): Command => ({
  command: RANDOM_NOTE_BY_SEARCH_COMMAND,
  title: 'Random note by search',
  description: () =>
    session.lastSearchQuery
      ? `Last search: ${session.lastSearchQuery}`
      : 'Open a random note matching a search',
  group: 'global',
  icon: 'sym_o_manage_search',
  interactive: true,
  handler: (api) => openRandomNoteBySearch(api, session),
});

const createCommands = (): Command[] => {
  const session: RandomNoteSession = {};
  return [createRandomNoteCommand(), createFilteredRandomNoteCommand(session)];
};

let registeredCommands: Command[] = [];

const unregisterCommands = (api: OrgNoteApi): void => {
  if (!registeredCommands.length) return;
  api.core.useCommands().remove(...registeredCommands);
  registeredCommands = [];
};

export const randomNoteExtension: Extension = {
  onMounted: async (api) => {
    unregisterCommands(api);
    registeredCommands = createCommands();
    api.core.useCommands().add(...registeredCommands);
  },

  onUnmounted: async (api) => {
    unregisterCommands(api);
  },
};

export { randomNoteManifest } from './manifest';
