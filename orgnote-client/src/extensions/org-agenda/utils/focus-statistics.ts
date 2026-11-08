import { addDays, eachDayOfInterval, format, startOfDay } from 'date-fns';
import { join, type FileMeta, type FileTask } from 'orgnote-api';
import type { ClockEntry } from 'org-mode-ast';
import type { CalendarHeatmapEntry } from 'src/components/charts/calendar-heatmap-types';
import { extractOrgTitleFromPath } from 'src/utils/extract-org-title-from-path';

export interface FocusInterval {
  readonly date: string;
  readonly durationMin: number;
  readonly endTime: number;
  readonly filePath: string;
  readonly fileTitle: string;
  readonly startTime: number;
  readonly taskStart: number;
  readonly taskText: string;
}

interface FocusIntervalSource {
  readonly endTime: number;
  readonly filePath: string;
  readonly fileTitle: string;
  readonly startTime: number;
  readonly taskStart: number;
  readonly taskText: string;
}

const DATE_FORMAT = 'yyyy-MM-dd';
const END_EXCLUSIVE_OFFSET_MS = 1;
const MINUTE_MS = 60_000;

const createDailySegment = (source: FocusIntervalSource, day: Date): FocusInterval => {
  const dayStart = startOfDay(day);
  const startTime = Math.max(source.startTime, dayStart.getTime());
  const endTime = Math.min(source.endTime, addDays(dayStart, 1).getTime());
  return {
    ...source,
    date: format(dayStart, DATE_FORMAT),
    durationMin: Math.floor((endTime - startTime) / MINUTE_MS),
    endTime,
    startTime,
  };
};

const splitByLocalDay = (source: FocusIntervalSource): FocusInterval[] =>
  eachDayOfInterval({
    start: new Date(source.startTime),
    end: new Date(source.endTime - END_EXCLUSIVE_OFFSET_MS),
  })
    .map((day) => createDailySegment(source, day))
    .filter((segment) => segment.durationMin > 0);

const toInterval = (
  clock: ClockEntry,
  task: FileTask,
  filePath: string,
  fileTitle: string,
): FocusInterval[] => {
  if (!clock.date || !clock.to) return [];
  const startTime = new Date(clock.date).getTime();
  const endTime = new Date(clock.to).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return [];
  return splitByLocalDay({
    endTime,
    filePath,
    fileTitle,
    startTime,
    taskStart: task.start ?? 0,
    taskText: task.text,
  });
};

const fileIntervals = (file: FileMeta): FocusInterval[] => {
  const filePath = join('/', ...file.filePath);
  const fileTitle = file.title?.trim() || extractOrgTitleFromPath(filePath);
  return (file.tasks ?? []).flatMap((task) =>
    (task.clocks ?? []).flatMap((clock) => toInterval(clock, task, filePath, fileTitle)),
  );
};

export const extractFocusIntervals = (files: readonly FileMeta[]): FocusInterval[] =>
  files.flatMap(fileIntervals).sort((left, right) => right.startTime - left.startTime);

export const createFocusCalendarEntries = (
  intervals: readonly FocusInterval[],
): CalendarHeatmapEntry[] => {
  const totals = intervals.reduce((values, interval) => {
    values.set(interval.date, (values.get(interval.date) ?? 0) + interval.durationMin);
    return values;
  }, new Map<string, number>());
  return [...totals].map(([date, value]) => ({ date, value }));
};

export const selectFocusIntervals = (
  intervals: readonly FocusInterval[],
  date: string,
): FocusInterval[] => intervals.filter((interval) => interval.date === date);
