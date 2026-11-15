import { join, type FileMeta, type FileTask } from 'orgnote-api';
import type { DateMarker } from 'src/models/date-picker';
import { extractOrgTitleFromPath } from 'src/utils/extract-org-title-from-path';

export interface TaskTreeNode extends Record<string, unknown> {
  id: string;
  label: string;
  icon?: string;
  kind: 'file' | 'task';
  filePath?: string;
  taskState?: FileTask['state'];
  taskKind?: FileTask['kind'];
  start?: number;
  end?: number;
  updatedAt?: string;
  children?: TaskTreeNode[];
}

export type UpdatedAtFilter = 'all' | 'today' | 'yesterday' | 'last-week' | 'last-month';

interface BuildTasksTreeOptions {
  includeCompletedTasks?: boolean;
  updatedAtFilter?: UpdatedAtFilter;
  selectedUpdatedAtDate?: string;
  now?: Date;
}

type NonAllUpdatedAtFilter = Exclude<UpdatedAtFilter, 'all'>;
type UpdatedAtPredicate = (date: Date, now: Date) => boolean;

const msPerDay = 24 * 60 * 60 * 1000;
const taskIcons = {
  done: 'sym_o_check_box',
  todo: 'sym_o_check_box_outline_blank',
} as const;
const calendarMarkerColor = 'accent';

const resolveAbsoluteFilePath = (file: FileMeta): string => join('/', ...file.filePath);

const resolveFileLabel = (file: FileMeta): string => {
  if (file.title?.trim()) {
    return file.title.trim();
  }

  return extractOrgTitleFromPath(resolveAbsoluteFilePath(file));
};

const resolveTaskLabel = (task: FileTask): string => task.text?.trim() ?? '';

const getTaskIcon = (task: FileTask): string =>
  task.state === 'done' ? taskIcons.done : taskIcons.todo;

const compareTasksByPosition = (left: FileTask, right: FileTask): number => {
  const leftStart = left.start ?? Number.MAX_SAFE_INTEGER;
  const rightStart = right.start ?? Number.MAX_SAFE_INTEGER;
  return leftStart - rightStart;
};

const createTaskNode = (task: FileTask, filePath: string): TaskTreeNode => ({
  id: task.id,
  label: resolveTaskLabel(task),
  icon: getTaskIcon(task),
  kind: 'task',
  filePath,
  taskState: task.state,
  taskKind: task.kind,
  start: task.start,
  end: task.end,
});

const getFileNodeId = (fileId: string) => `file:${fileId}`;

const isSameDay = (left: Date, right: Date): boolean => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const hasDateWithinDays = (date: Date, now: Date, days: number): boolean => {
  return date.getTime() >= now.getTime() - days * msPerDay;
};

const parseDate = (value: string | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatCalendarDate = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

const resolveCalendarDate = (value: string | undefined): string | undefined => {
  const date = parseDate(value);
  if (!date) {
    return undefined;
  }

  return formatCalendarDate(date);
};

const matchesSelectedUpdatedAtDate = (
  updatedAt: string | undefined,
  selectedDate: string | undefined,
): boolean => {
  if (!selectedDate) {
    return true;
  }

  return resolveCalendarDate(updatedAt) === selectedDate;
};

const resolveVisibleTasks = (file: FileMeta, includeCompletedTasks: boolean): FileTask[] => {
  return (file.tasks ?? []).filter((task) => includeCompletedTasks || task.state !== 'done');
};

const filterPredicates: Record<NonAllUpdatedAtFilter, UpdatedAtPredicate> = {
  today: (date, now) => isSameDay(date, now),
  yesterday: (date, now) => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(date, yesterday);
  },
  'last-week': (date, now) => hasDateWithinDays(date, now, 7),
  'last-month': (date, now) => hasDateWithinDays(date, now, 30),
};

const matchesUpdatedAtFilter = (
  updatedAt: string | undefined,
  filter: UpdatedAtFilter,
  now: Date,
): boolean => {
  if (filter === 'all') {
    return true;
  }

  const date = parseDate(updatedAt);
  if (!date) {
    return false;
  }

  return filterPredicates[filter](date, now);
};

const createFileNode = (
  file: FileMeta,
  options: BuildTasksTreeOptions,
): TaskTreeNode | undefined => {
  const includeCompletedTasks = options.includeCompletedTasks ?? true;
  const updatedAtFilter = options.updatedAtFilter ?? 'all';
  const selectedUpdatedAtDate = options.selectedUpdatedAtDate;
  const now = options.now ?? new Date();
  if (!matchesUpdatedAtFilter(file.updatedAt, updatedAtFilter, now)) {
    return undefined;
  }

  if (!matchesSelectedUpdatedAtDate(file.updatedAt, selectedUpdatedAtDate)) {
    return undefined;
  }

  const tasks = resolveVisibleTasks(file, includeCompletedTasks);
  if (tasks.length === 0) {
    return undefined;
  }

  const filePath = resolveAbsoluteFilePath(file);

  return {
    id: getFileNodeId(file.id),
    label: resolveFileLabel(file),
    icon: 'sym_o_description',
    kind: 'file',
    filePath,
    updatedAt: file.updatedAt,
    children: [...tasks].sort(compareTasksByPosition).map((task) => createTaskNode(task, filePath)),
  };
};

const toTimestamp = (value?: string): number => parseDate(value)?.getTime() ?? 0;

const compareFilesByLastUpdated = (left: TaskTreeNode, right: TaskTreeNode): number => {
  const timestampDiff = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
  if (timestampDiff !== 0) {
    return timestampDiff;
  }

  return left.label.localeCompare(right.label);
};

export const buildTasksTree = (
  files: FileMeta[],
  options: BuildTasksTreeOptions = {},
): TaskTreeNode[] => {
  return files
    .map((file) => createFileNode(file, options))
    .filter((node): node is TaskTreeNode => node !== undefined)
    .sort(compareFilesByLastUpdated);
};

export const buildTaskDateMarkers = (
  files: FileMeta[],
  options: Omit<BuildTasksTreeOptions, 'selectedUpdatedAtDate'> = {},
): DateMarker[] => {
  const includeCompletedTasks = options.includeCompletedTasks ?? true;
  const updatedAtFilter = options.updatedAtFilter ?? 'all';
  const now = options.now ?? new Date();
  const seenDates = new Set<string>();

  return files.reduce<DateMarker[]>((markers, file) => {
    if (
      !matchesUpdatedAtFilter(file.updatedAt, updatedAtFilter, now) ||
      resolveVisibleTasks(file, includeCompletedTasks).length === 0
    ) {
      return markers;
    }

    const date = resolveCalendarDate(file.updatedAt);
    if (!date || seenDates.has(date)) {
      return markers;
    }

    seenDates.add(date);
    markers.push({ date, color: calendarMarkerColor });
    return markers;
  }, []);
};
