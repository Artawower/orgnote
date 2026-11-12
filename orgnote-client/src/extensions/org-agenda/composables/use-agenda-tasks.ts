import { addDays, parseISO, startOfDay } from 'date-fns';
import { join, type FileMeta, type FileTask } from 'orgnote-api';
import { storeToRefs } from 'pinia';
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue';
import { extractOrgTitleFromPath } from 'src/utils/extract-org-title-from-path';
import { DEFAULT_INPUT_DEBOUNCE } from 'src/constants/default-input-debounce';
import { ORG_PRIORITY_LETTERS } from 'src/constants/org-mode';
import { debounce } from 'src/utils/debounce';
import { useAgendaFilterStore } from '../stores/agenda-filter-store';
import { useAgendaTasksStore } from '../stores/agenda-tasks-store';
import { createAgendaTaskSearchId } from '../services/agenda-task-search-index';
import type { AgendaTask } from '../types';
import type {
  AgendaDateFilter,
  AgendaDayPreset,
  AgendaFilter,
  AgendaRangePreset,
  AgendaTaskQuery,
} from '../models/agenda-task-query';
import {
  findNextOccurrenceInRange,
  findTaskDateInRange,
  isOverdue,
  isToday,
  isTomorrow,
} from '../utils/agenda-filters';

export type { AgendaDateFilter, AgendaFilter, AgendaTaskQuery } from '../models/agenda-task-query';

export interface AgendaTaskView extends AgendaTask {
  viewDate: Date;
}

export interface AgendaTaskGroup {
  fileTitle: string;
  filePath: string;
  tasks: AgendaTaskView[];
}

export interface AgendaFileFilterOption {
  fileTitle: string;
  filePath: string;
  taskCount: number;
}

interface QueryContext {
  readonly query: AgendaTaskQuery;
  readonly now: Date;
  readonly rankByTaskId?: ReadonlyMap<string, number>;
}

const todayForAgenda = (now: Date): Date => startOfDay(now);

const filterPredicates: Record<
  Exclude<AgendaFilter, 'all' | 'next7days'>,
  (task: FileTask, now: Date) => boolean
> = {
  overdue: isOverdue,
  today: isToday,
  tomorrow: isTomorrow,
};

const resolveFileTitle = (file: FileMeta): string => {
  const absolutePath = join('/', ...file.filePath);
  return file.title?.trim() || extractOrgTitleFromPath(absolutePath);
};

const resolveAbsolutePath = (file: FileMeta): string => join('/', ...file.filePath);

const isNextSevenDaysVisible = (task: FileTask, now: Date): boolean =>
  findNextOccurrenceInRange(task, now, 7) !== undefined || isOverdue(task, now);

const isPresetVisible = (task: FileTask, filter: AgendaFilter, now: Date): boolean => {
  if (filter === 'all') return true;
  if (filter === 'next7days') return isNextSevenDaysVisible(task, now);
  return filterPredicates[filter](task, now);
};

const computePresetViewDate = (task: FileTask, filter: AgendaFilter, now: Date): Date => {
  if (filter === 'tomorrow') return addDays(todayForAgenda(now), 1);
  if (filter !== 'next7days') return todayForAgenda(now);
  return findNextOccurrenceInRange(task, now, 7) ?? todayForAgenda(now);
};

type RelativeAgendaPreset = AgendaDayPreset | AgendaRangePreset;

interface RelativePresetContext {
  readonly preset: RelativeAgendaPreset;
  readonly now: Date;
}

const resolveRelativePresetContext = (
  filter: AgendaDateFilter,
): RelativePresetContext | undefined => {
  if (filter.kind === 'day' && filter.relativePreset) {
    const selectedDate = parseISO(filter.value);
    const now =
      filter.relativePreset === 'tomorrow' ? addDays(selectedDate, -1) : selectedDate;
    return { preset: filter.relativePreset, now };
  }
  if (filter.kind === 'range' && filter.relativePreset) {
    return { preset: filter.relativePreset, now: parseISO(filter.from) };
  }
  return;
};

const resolvePresetTaskViewDate = (
  task: FileTask,
  context: RelativePresetContext,
): Date | undefined => {
  if (!isPresetVisible(task, context.preset, context.now)) return;
  return computePresetViewDate(task, context.preset, context.now);
};

const resolveTaskViewDate = (
  task: FileTask,
  filter: AgendaDateFilter,
  now: Date,
): Date | undefined => {
  const relativePreset = resolveRelativePresetContext(filter);
  if (relativePreset) return resolvePresetTaskViewDate(task, relativePreset);
  if (filter.kind === 'day') {
    const date = parseISO(filter.value);
    return findTaskDateInRange(task, date, date);
  }
  if (filter.kind === 'range') {
    return findTaskDateInRange(task, parseISO(filter.from), parseISO(filter.to));
  }
  if (!isPresetVisible(task, filter.value, now)) return undefined;
  return computePresetViewDate(task, filter.value, now);
};

export const isAgendaEligible = (task: FileTask): boolean =>
  task.kind === 'headline-checkbox' || task.kind === 'headline-todo';

const buildSearchRanks = (
  matchingTaskIds: readonly string[] | undefined,
): ReadonlyMap<string, number> | undefined => {
  if (!matchingTaskIds) return undefined;
  return new Map(matchingTaskIds.map((taskId, index) => [taskId, index]));
};

const toTaskView = (
  task: FileTask,
  filePath: string,
  context: QueryContext,
): AgendaTaskView | undefined => {
  const taskId = createAgendaTaskSearchId(filePath, task.id);
  if (context.rankByTaskId && !context.rankByTaskId.has(taskId)) return undefined;
  const viewDate = resolveTaskViewDate(task, context.query.dateFilter, context.now);
  if (!viewDate) return undefined;
  return { ...task, filePath, viewDate };
};

const taskRank = (task: AgendaTaskView, ranks: ReadonlyMap<string, number>): number =>
  ranks.get(createAgendaTaskSearchId(task.filePath, task.id)) ?? Number.MAX_SAFE_INTEGER;

const TASK_PRIORITY_RANKS: ReadonlyMap<string, number> = new Map(
  ORG_PRIORITY_LETTERS.map((priority, rank) => [priority, rank]),
);
const UNSET_TASK_PRIORITY_RANK = ORG_PRIORITY_LETTERS.length;

const taskPriorityRank = (task: AgendaTaskView): number =>
  TASK_PRIORITY_RANKS.get(task.priority?.trim().toUpperCase() ?? '') ?? UNSET_TASK_PRIORITY_RANK;

const compareTasksByPriority = (left: AgendaTaskView, right: AgendaTaskView): number =>
  taskPriorityRank(left) - taskPriorityRank(right);

const compareTasksBySearchRank =
  (ranks: ReadonlyMap<string, number>) =>
  (left: AgendaTaskView, right: AgendaTaskView): number =>
    taskRank(left, ranks) - taskRank(right, ranks);

const sortTasks = (
  tasks: AgendaTaskView[],
  ranks: ReadonlyMap<string, number> | undefined,
): AgendaTaskView[] =>
  [...tasks].sort(ranks ? compareTasksBySearchRank(ranks) : compareTasksByPriority);

const toGroup = (file: FileMeta, context: QueryContext): AgendaTaskGroup | undefined => {
  const filePath = resolveAbsolutePath(file);
  if (context.query.filePath && context.query.filePath !== filePath) return undefined;
  const tasks = (file.tasks ?? [])
    .filter(isAgendaEligible)
    .flatMap((task) => {
      const view = toTaskView(task, filePath, context);
      return view ? [view] : [];
    });
  if (!tasks.length) return undefined;
  return { fileTitle: resolveFileTitle(file), filePath, tasks: sortTasks(tasks, context.rankByTaskId) };
};

const groupRank = (group: AgendaTaskGroup, ranks: ReadonlyMap<string, number>): number =>
  Math.min(...group.tasks.map((task) => taskRank(task, ranks)));

const sortGroupsByRank = (
  groups: AgendaTaskGroup[],
  ranks: ReadonlyMap<string, number> | undefined,
): AgendaTaskGroup[] =>
  ranks ? [...groups].sort((a, b) => groupRank(a, ranks) - groupRank(b, ranks)) : groups;

export const buildAgendaFileFilterOptions = (files: FileMeta[]): AgendaFileFilterOption[] =>
  files
    .map((file) => ({
      fileTitle: resolveFileTitle(file),
      filePath: resolveAbsolutePath(file),
      taskCount: (file.tasks ?? []).filter(isAgendaEligible).length,
    }))
    .filter((file) => file.taskCount > 0)
    .sort((left, right) => left.fileTitle.localeCompare(right.fileTitle));

export const buildAgendaTaskGroups = (
  files: FileMeta[],
  query: AgendaTaskQuery,
  now = new Date(),
): AgendaTaskGroup[] => {
  const rankByTaskId = buildSearchRanks(query.matchingTaskIds);
  const context: QueryContext = { query, now, rankByTaskId };
  const groups = files.flatMap((file) => {
    const group = toGroup(file, context);
    return group ? [group] : [];
  });
  return sortGroupsByRank(groups, rankByTaskId);
};

export const useAgendaTasks = (dateFilter: MaybeRefOrGetter<AgendaDateFilter>) => {
  const tasksStore = useAgendaTasksStore();
  const filterStore = useAgendaFilterStore();
  const { agendaFiles, loading, totalByFilter } = storeToRefs(tasksStore);
  const indexedQuery = ref(filterStore.searchQuery);
  const updateIndexedQuery = debounce((query: string) => {
    indexedQuery.value = query;
  }, DEFAULT_INPUT_DEBOUNCE);

  watch(() => filterStore.searchQuery, updateIndexedQuery);

  const matchingTaskIds = computed(() => {
    if (!indexedQuery.value.trim()) return undefined;
    return tasksStore.searchTaskIds(indexedQuery.value);
  });

  const groups = computed(() =>
    buildAgendaTaskGroups(agendaFiles.value, {
      dateFilter: toValue(dateFilter),
      filePath: filterStore.selectedFilePath,
      matchingTaskIds: matchingTaskIds.value,
    }),
  );

  const filteredTaskCount = computed(() =>
    groups.value.reduce((total, group) => total + group.tasks.length, 0),
  );

  onMounted(() => {
    void tasksStore.ensureLoaded();
  });

  onUnmounted(updateIndexedQuery.cancel);

  return { loading, groups, totalByFilter, filteredTaskCount };
};
