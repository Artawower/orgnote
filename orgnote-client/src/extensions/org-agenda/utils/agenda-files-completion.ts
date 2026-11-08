import type { OrgNoteApi, CompletionSearchResult } from 'orgnote-api';
import type { FileMeta } from 'orgnote-api';
import { join } from 'orgnote-api';
import { fileBaseName } from 'src/utils/file-path';
import { useAgendaTasksStore } from '../stores/agenda-tasks-store';

const resolveFilePath = (file: FileMeta): string => join('/', ...file.filePath);

const isOrgFile = (file: FileMeta): boolean =>
  file.filePath[file.filePath.length - 1]?.endsWith('.org') ?? false;

const matchesSearch = (file: FileMeta, search: string): boolean => {
  if (!search) return true;
  const name = fileBaseName(resolveFilePath(file));
  return name.toLowerCase().includes(search.toLowerCase());
};

const isInboxFile = (file: FileMeta, inboxFileName: string): boolean => {
  const path = resolveFilePath(file);
  return path.endsWith(`/${inboxFileName}`) || path === inboxFileName;
};

const toCompletionCandidate = (
  file: FileMeta,
  completion: ReturnType<OrgNoteApi['core']['useCompletion']>,
) => {
  const path = resolveFilePath(file);
  return {
    icon: 'sym_o_description' as const,
    title: fileBaseName(path),
    description: path,
    data: file,
    commandHandler: () => completion.close(path),
  };
};

export const createAgendaFilesGetter = (
  api: OrgNoteApi,
  _agendaFilesPath: string,
  inboxFileName: string,
) => {
  const completion = api.core.useCompletion();
  const store = useAgendaTasksStore();

  return (search: string): CompletionSearchResult<FileMeta> => {
    const files = store.agendaFiles.filter(isOrgFile);
    const filtered = files.filter((f) => matchesSearch(f, search));
    const inbox = filtered.filter((f) => isInboxFile(f, inboxFileName));
    const rest = filtered.filter((f) => !isInboxFile(f, inboxFileName));
    const sorted = [...inbox, ...rest];

    return {
      total: sorted.length,
      result: sorted.map((f) => toCompletionCandidate(f, completion)),
    };
  };
};
