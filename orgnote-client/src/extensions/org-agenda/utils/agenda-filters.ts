import type { FileMeta } from 'orgnote-api';
import type { OrgDate, OrgRepeater } from 'org-mode-ast';
import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInMilliseconds,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';

type FileTask = NonNullable<FileMeta['tasks']>[number];
type ConstantRepeater = OrgRepeater & { unit: 'h' | 'd' | 'w' };
type CalendarRepeater = OrgRepeater & { unit: 'm' | 'y' };

const CONSTANT_OCCURRENCE_LIMIT = 100;
const CALENDAR_PROJECTION_LIMIT = 1000;

const parseOrgDate = (isoDate: string): Date => startOfDay(parseISO(isoDate.slice(0, 10)));

const toDateKey = (date: Date): string => format(date, 'yyyy-MM-dd');

const firstTaskDate = (task: FileTask): OrgDate | undefined => task.scheduled ?? task.deadline;

export const getActiveDate = (task: FileTask): string | undefined =>
  task.deadline?.date ?? task.scheduled?.date;

const parseTaskDate = (date: OrgDate): Date | undefined => {
  if (!date.date) return undefined;
  const parsed = parseOrgDate(date.date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const isConstantStep = (repeater: OrgRepeater): repeater is ConstantRepeater =>
  repeater.unit === 'h' || repeater.unit === 'd' || repeater.unit === 'w';

const isCalendarStep = (repeater: OrgRepeater): repeater is CalendarRepeater =>
  repeater.unit === 'm' || repeater.unit === 'y';

const buildWindow = (now: Date, startOffset: number, endOffset: number): [Date, Date] => {
  const today = startOfDay(now);
  return [addDays(today, startOffset), addDays(today, endOffset)];
};

const addConstantStep = (date: Date, repeater: ConstantRepeater, steps: number): Date => {
  const amount = repeater.value * steps;
  if (repeater.unit === 'h') return addHours(date, amount);
  if (repeater.unit === 'd') return addDays(date, amount);
  return addWeeks(date, amount);
};

const constantStepMilliseconds = (base: Date, repeater: ConstantRepeater): number =>
  differenceInMilliseconds(addConstantStep(base, repeater, 1), base);

type Stepper = (date: Date) => Date;

const safeStep = (current: Date, step: Stepper): Date | undefined => {
  const next = step(current);
  return next.getTime() > current.getTime() ? next : undefined;
};

const advanceWhile = (
  start: Date,
  step: Stepper,
  shouldContinue: (date: Date) => boolean,
  limit: number,
): Date | undefined => {
  let current = start;
  for (let i = 0; i < limit; i += 1) {
    if (!shouldContinue(current)) return current;
    const next = safeStep(current, step);
    if (!next) return undefined;
    current = next;
  }
  return undefined;
};

const collectWhileInWindow = (
  first: Date,
  step: Stepper,
  windowEnd: Date,
  limit: number,
): Date[] => {
  const occurrences: Date[] = [];
  let current = first;
  for (let i = 0; i < limit && current <= windowEnd; i += 1) {
    occurrences.push(current);
    const next = safeStep(current, step);
    if (!next) return occurrences;
    current = next;
  }
  return occurrences;
};

const collectConstantOccurrences = (
  base: Date,
  repeater: ConstantRepeater,
  windowStart: Date,
  windowEnd: Date,
): Date[] => {
  const stepMs = constantStepMilliseconds(base, repeater);
  if (stepMs <= 0 || windowEnd < base) return [];
  const stepsToWindow =
    windowStart <= base ? 0 : Math.ceil(differenceInMilliseconds(windowStart, base) / stepMs);
  const first = addConstantStep(base, repeater, stepsToWindow);
  const step: Stepper = (date) => addConstantStep(date, repeater, 1);
  return collectWhileInWindow(first, step, windowEnd, CONSTANT_OCCURRENCE_LIMIT);
};

const addCalendarStep = (date: Date, repeater: CalendarRepeater): Date => {
  if (repeater.unit === 'm') return addMonths(date, repeater.value);
  return addYears(date, repeater.value);
};

const collectCalendarOccurrences = (
  base: Date,
  repeater: CalendarRepeater,
  windowStart: Date,
  windowEnd: Date,
): Date[] => {
  if (repeater.value <= 0) return [];
  const step: Stepper = (date) => addCalendarStep(date, repeater);
  const first = advanceWhile(base, step, (date) => date < windowStart, CALENDAR_PROJECTION_LIMIT);
  if (!first || first > windowEnd) return [];
  return collectWhileInWindow(first, step, windowEnd, CALENDAR_PROJECTION_LIMIT);
};

const getDateOccurrencesInRange = (date: OrgDate, windowStart: Date, windowEnd: Date): Date[] => {
  const base = parseTaskDate(date);
  if (!base) return [];
  if (!date.repeater) return base >= windowStart && base <= windowEnd ? [base] : [];
  if (isConstantStep(date.repeater))
    return collectConstantOccurrences(base, date.repeater, windowStart, windowEnd);
  if (isCalendarStep(date.repeater))
    return collectCalendarOccurrences(base, date.repeater, windowStart, windowEnd);
  return [];
};

const getOccurrencesInRange = (
  task: FileTask,
  now: Date,
  startOffset: number,
  endOffset: number,
): Date[] => {
  const date = firstTaskDate(task);
  if (!date?.date) return [];
  const [windowStart, windowEnd] = buildWindow(now, startOffset, endOffset);
  return getDateOccurrencesInRange(date, windowStart, windowEnd);
};

const getDoneDates = (task: FileTask): string[] => {
  if (task.doneDates?.length) return task.doneDates;
  return task.lastDoneAt ? [task.lastDoneAt] : [];
};

const normalizeDateRange = (from: Date, to: Date): [Date, Date] => {
  const fromDay = startOfDay(from);
  const toDay = startOfDay(to);
  return fromDay <= toDay ? [fromDay, toDay] : [toDay, fromDay];
};

const getDoneDateKeys = (task: FileTask): Set<string> =>
  new Set(
    getDoneDates(task)
      .map(parseOrgDate)
      .filter((date) => !Number.isNaN(date.getTime()))
      .map(toDateKey),
  );

const getCompletedDatesInRange = (task: FileTask, from: Date, to: Date): Date[] =>
  getDoneDates(task)
    .map(parseOrgDate)
    .filter((date) => !Number.isNaN(date.getTime()) && date >= from && date <= to);

const mergeTaskDates = (occurrences: Date[], completions: Date[]): Date[] => {
  const datesByKey = new Map<string, Date>();
  [...occurrences, ...completions].forEach((date) => datesByKey.set(toDateKey(date), date));
  return [...datesByKey.values()].sort((left, right) => left.getTime() - right.getTime());
};

export const findTaskDateInRange = (task: FileTask, from: Date, to: Date): Date | undefined => {
  const [rangeStart, rangeEnd] = normalizeDateRange(from, to);
  const taskDate = firstTaskDate(task);
  const occurrences = taskDate ? getDateOccurrencesInRange(taskDate, rangeStart, rangeEnd) : [];
  const done = getDoneDateKeys(task);
  const firstUnfinished = occurrences.find((date) => !done.has(toDateKey(date)));
  if (firstUnfinished) return firstUnfinished;
  return mergeTaskDates(occurrences, getCompletedDatesInRange(task, rangeStart, rangeEnd)).at(-1);
};

export const findNextOccurrenceInRange = (
  task: FileTask,
  now: Date,
  daysAhead: number,
): Date | undefined => {
  const occurrences = getOccurrencesInRange(task, now, 0, daysAhead);
  if (!occurrences.length) return undefined;
  const done = getDoneDateKeys(task);
  const firstUnfinished = occurrences.find((date) => !done.has(toDateKey(date)));
  return firstUnfinished ?? occurrences.at(-1);
};

const hasOccurrenceInRange = (
  task: FileTask,
  startOffset: number,
  endOffset: number,
  now = new Date(),
): boolean => getOccurrencesInRange(task, now, startOffset, endOffset).length > 0;

const isOverdueInternal = (task: FileTask, now: Date): boolean => {
  if (task.state === 'done') return false;
  const isoDate = getActiveDate(task);
  if (!isoDate) return false;
  return differenceInCalendarDays(parseOrgDate(isoDate), now) < 0;
};

export const isToday = (task: FileTask, now = new Date()): boolean =>
  hasOccurrenceInRange(task, 0, 0, now) || isOverdueInternal(task, now) || isCompletedOn(task, now);

export const isTomorrow = (task: FileTask, now = new Date()): boolean => {
  if (hasOccurrenceInRange(task, 1, 1, now)) return true;
  return isCompletedOn(task, addDays(startOfDay(now), 1));
};

export const isOverdue = (task: FileTask, now = new Date()): boolean =>
  isOverdueInternal(task, now);

export const hasRepeater = (task: FileTask): boolean =>
  !!(task.scheduled?.repeater ?? task.deadline?.repeater);

export const isCompletedOn = (task: FileTask, date: Date): boolean =>
  getDoneDates(task).some((doneDate) => isSameDay(parseOrgDate(doneDate), date));
