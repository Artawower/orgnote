import type { Command, Extension, OrgNoteApi, FileMeta, CompletionCandidate } from 'orgnote-api';
import { join } from 'orgnote-api';

const COMMAND_NAME = 'recent files';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

const formatRelativeTime = (isoDate: string | undefined): string => {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHours = Math.floor(diffMs / MS_PER_HOUR);
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

const getFileName = (filePath: string[]): string => filePath.at(-1) ?? 'Untitled';

const fileToCandidate = (
  file: FileMeta,
  api: OrgNoteApi,
): CompletionCandidate<FileMeta> => ({
  icon: 'sym_o_history',
  title: file.title ?? getFileName(file.filePath),
  description: formatRelativeTime(file.touchedAt),
  data: file,
  commandHandler: () => {
    api.core.useBufferViewer().open(join('/', ...file.filePath));
    api.core.useCompletion().close();
  },
});

const matchesFilter = (file: FileMeta, normalizedFilter: string): boolean => {
  if (!normalizedFilter) return true;
  const title = (file.title ?? getFileName(file.filePath)).toLowerCase();
  return title.includes(normalizedFilter);
};

const paginateFiles = (
  files: FileMeta[],
  limit?: number,
  offset?: number,
): FileMeta[] => {
  const start = offset ?? 0;
  const end = limit ? start + limit : undefined;
  return files.slice(start, end);
};

const createRecentFilesGetter = (api: OrgNoteApi) => {
  return async (filter: string, limit?: number, offset?: number) => {
    const fileMeta = api.core.useFileMeta();
    const normalizedFilter = filter.toLowerCase().trim();

    if (!normalizedFilter) {
      const [files, total] = await Promise.all([
        fileMeta.getAll({ limit, offset }),
        fileMeta.count(),
      ]);

      return {
        total,
        result: files.map((file) => fileToCandidate(file, api)),
      };
    }

    const files = await fileMeta.getAll();
    const filtered = files.filter((file) => matchesFilter(file, normalizedFilter));
    const paged = paginateFiles(filtered, limit, offset);

    return {
      total: filtered.length,
      result: paged.map((file) => fileToCandidate(file, api)),
    };
  };
};

const openRecentfCompletion = async (api: OrgNoteApi): Promise<void> => {
  const completion = api.core.useCompletion();

  await completion.open<FileMeta, void>({
    type: 'choice',
    placeholder: 'Recent files...',
    itemsGetter: createRecentFilesGetter(api),
  });
};

const createCommand = (): Command => ({
  command: COMMAND_NAME,
  group: 'global',
  icon: 'sym_o_history',
  handler: openRecentfCompletion,
});

const registeredByApi = new Map<OrgNoteApi, Command>();

export const recentfExtension: Extension = {
  onMounted: async (api) => {
    const existing = registeredByApi.get(api);
    if (existing) {
      api.core.useCommands().remove(existing);
      registeredByApi.delete(api);
    }

    const command = createCommand();
    api.core.useCommands().add(command);
    registeredByApi.set(api, command);
  },

  onUnmounted: async (api) => {
    const registered = registeredByApi.get(api);
    if (!registered) return;
    api.core.useCommands().remove(registered);
    registeredByApi.delete(api);
  },
};

export { recentfManifest } from './manifest';
