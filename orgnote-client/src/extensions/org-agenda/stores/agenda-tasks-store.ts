import { defineStore, storeToRefs } from 'pinia';
import { computed, shallowRef, ref, watch } from 'vue';
import { join, type FileMeta, type FileTask } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { updateFileText } from 'src/utils/update-file-text';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { createDirPath } from 'src/utils/create-dir-path';
import { findNextOccurrenceInRange, isOverdue, isToday, isTomorrow } from '../utils/agenda-filters';
import { resolveAgendaConfig } from '../agenda-config';
import { AGENDA_DEFAULT_INBOX_FILENAME } from '../constants';
import { orgAgendaManifest } from '../manifest';
import type { AgendaFilter } from '../composables/use-agenda-tasks';
import { createTask, type CreateTaskInput } from 'orgnote-api/utils';
import { extractOrgTitleFromPath } from 'src/utils/extract-org-title-from-path';
import {
  createAgendaTaskSearchId,
  createAgendaTaskSearchIndex,
  type AgendaTaskSearchEntry,
} from '../services/agenda-task-search-index';

const isAgendaEligible = (task: FileTask): boolean =>
  task.kind === 'headline-checkbox' || task.kind === 'headline-todo';

const eligibleTasks = (file: FileMeta): FileTask[] => (file.tasks ?? []).filter(isAgendaEligible);

const resolveAbsolutePath = (file: FileMeta): string => join('/', ...file.filePath);

const resolveFileTitle = (file: FileMeta): string =>
  file.title?.trim() || extractOrgTitleFromPath(resolveAbsolutePath(file));

const toSearchEntry = (file: FileMeta, task: FileTask): AgendaTaskSearchEntry => {
  const filePath = resolveAbsolutePath(file);
  return {
    searchId: createAgendaTaskSearchId(filePath, task.id),
    text: task.text,
    tags: task.tags,
    fileTitle: resolveFileTitle(file),
    filePath,
    todoKeyword: task.todoKeyword,
    priority: task.priority,
  };
};

const buildSearchEntries = (files: FileMeta[]): AgendaTaskSearchEntry[] =>
  files.flatMap((file) => eligibleTasks(file).map((task) => toSearchEntry(file, task)));

const isUnderAgendaPath = (file: FileMeta, agendaFilesPath: string | undefined): boolean => {
  if (!agendaFilesPath) return true;
  const absolute = resolveAbsolutePath(file);
  return absolute === agendaFilesPath || absolute.startsWith(createDirPath(agendaFilesPath));
};

const isNextSevenDaysVisible = (task: FileTask, now: Date): boolean =>
  findNextOccurrenceInRange(task, now, 7) !== undefined || isOverdue(task, now);

const emptyTotals = (): Record<AgendaFilter, number> => ({
  overdue: 0,
  today: 0,
  tomorrow: 0,
  next7days: 0,
  all: 0,
});

const countFileTasks = (
  acc: Record<AgendaFilter, number>,
  file: FileMeta,
  now: Date,
): Record<AgendaFilter, number> => {
  const tasks = eligibleTasks(file);
  acc.all += tasks.length;
  acc.overdue += tasks.filter((task) => isOverdue(task, now)).length;
  acc.today += tasks.filter((task) => isToday(task, now)).length;
  acc.tomorrow += tasks.filter((task) => isTomorrow(task, now)).length;
  acc.next7days += tasks.filter((task) => isNextSevenDaysVisible(task, now)).length;
  return acc;
};

const buildTotalsByFilter = (files: FileMeta[], now = new Date()): Record<AgendaFilter, number> =>
  files.reduce((acc, file) => countFileTasks(acc, file, now), emptyTotals());

export const useAgendaTasksStore = defineStore('agendaTasks', () => {
  const allFiles = shallowRef<FileMeta[]>([]);
  const loading = ref(false);
  const taskSearchIndex = createAgendaTaskSearchIndex();
  let initialLoad: Promise<void> | undefined;
  let watchersAttached = false;

  const agendaConfig = computed(() =>
    resolveAgendaConfig(api.core.useExtensions().getExtensionConfig(orgAgendaManifest.name).value),
  );

  const agendaFiles = computed(() =>
    allFiles.value.filter((file) => isUnderAgendaPath(file, agendaConfig.value.agendaFilesPath)),
  );

  const totalByFilter = computed(() => buildTotalsByFilter(agendaFiles.value));

  const loadFiles = async (silent = false): Promise<void> => {
    if (!silent) loading.value = true;
    const result = await to(() => api.core.useFileMeta().getAll(), 'Failed to load agenda tasks')();
    if (!silent) loading.value = false;
    if (result.isErr()) {
      reporter.reportError(result.error);
      return;
    }
    allFiles.value = result.value;
    taskSearchIndex.replace(buildSearchEntries(result.value));
  };

  const searchTaskIds = (query: string): string[] => taskSearchIndex.search(query);

  const attachWatchersOnce = (): void => {
    if (watchersAttached) return;
    watchersAttached = true;
    const fileWatcher = api.core.useFileWatcher();
    const fileSearch = api.core.useFileSearch();
    const { isIndexing } = storeToRefs(fileSearch);
    fileWatcher.watch('/', () => loadFiles(true), { recursive: true });
    watch(isIndexing, (now, was) => {
      if (!now && was) void loadFiles(true);
    });
  };

  const ensureLoaded = async (): Promise<void> => {
    attachWatchersOnce();
    if (allFiles.value.length > 0) return;
    initialLoad ??= loadFiles().finally(() => {
      initialLoad = undefined;
    });
    await initialLoad;
  };

  const resolveInboxPath = (targetFile?: string): string => {
    if (targetFile) return targetFile;
    if (agendaConfig.value.inboxFilePath) return agendaConfig.value.inboxFilePath;
    const basePath = agendaConfig.value.agendaFilesPath ?? '/';
    return join(basePath, AGENDA_DEFAULT_INBOX_FILENAME);
  };

  const createTaskInFile = async (
    input: CreateTaskInput & { targetFile?: string },
  ): Promise<boolean> => {
    const target = resolveInboxPath(input.targetFile);
    const result = await to(updateFileText, 'Failed to write task')(
      api.core.useFileContent(),
      target,
      (content) => createTask(content, input),
    );
    if (result.isOk()) return result.value;
    reporter.reportError(result.error);
    return false;
  };

  return {
    allFiles,
    agendaFiles,
    agendaConfig,
    loading,
    totalByFilter,
    loadFiles,
    ensureLoaded,
    searchTaskIds,
    createTaskInFile,
  };
});
