import { format } from 'date-fns';
import { expect, test } from 'vitest';
import type { FileMeta } from 'orgnote-api';
import type { OrgRepeater } from 'org-mode-ast';
import {
  isOverdue,
  isToday,
  isTomorrow,
  isCompletedOn,
  hasRepeater,
  findNextOccurrenceInRange,
  findTaskDateInRange,
  getActiveDate,
} from './agenda-filters';

type FileTask = NonNullable<FileMeta['tasks']>[number];

const now = new Date('2026-05-12T12:00:00Z');

const withScheduled = (date: string): FileTask => ({
  id: '1',
  kind: 'headline-todo',
  state: 'todo',
  text: 'Task',
  scheduled: { date, active: true, hasTime: false, start: 0, end: 0 },
});

const withScheduledRepeater = (date: string, repeater: OrgRepeater): FileTask => ({
  id: '1',
  kind: 'headline-todo',
  state: 'todo',
  text: 'Task',
  scheduled: { date, active: true, hasTime: false, start: 0, end: 0, repeater },
});

const withDeadline = (date: string): FileTask => ({
  id: '1',
  kind: 'headline-todo',
  state: 'todo',
  text: 'Task',
  deadline: { date, active: true, hasTime: false, start: 0, end: 0 },
});

const withBoth = (scheduledDate: string, deadlineDate: string): FileTask => ({
  id: '1',
  kind: 'headline-todo',
  state: 'todo',
  text: 'Task',
  scheduled: { date: scheduledDate, active: true, hasTime: false, start: 0, end: 0 },
  deadline: { date: deadlineDate, active: true, hasTime: false, start: 0, end: 0 },
});

const dailyRepeater = { type: '+', value: 1, unit: 'd' } as const;
const everyTwoDaysRepeater = { type: '+', value: 2, unit: 'd' } as const;
const monthlyRepeater = { type: '+', value: 1, unit: 'm' } as const;
const zeroDayRepeater = { type: '+', value: 0, unit: 'd' } as const;

const noDateTask: FileTask = { id: '1', kind: 'headline-todo', state: 'todo', text: 'Task' };

const utcNoon = (date: string): Date => new Date(`${date}T12:00:00Z`);

const dateKey = (date: Date | undefined): string | undefined =>
  date ? format(date, 'yyyy-MM-dd') : undefined;

// NEW: findNextOccurrenceInRange — unified helper for agenda range views
test('findNextOccurrenceInRange_recurringNothingDone_returnsFirstOccurrence', () => {
  const task = withScheduledRepeater('2026-05-12', dailyRepeater);
  const result = findNextOccurrenceInRange(task, now, 7);
  expect(dateKey(result)).toBe('2026-05-12');
});

test('findNextOccurrenceInRange_recurringTodayDone_returnsTomorrow', () => {
  const task: FileTask = {
    ...withScheduledRepeater('2026-05-13', dailyRepeater),
    doneDates: ['2026-05-12'],
  };
  // base 2026-05-13 (advanced after today's done), first unfinished = 2026-05-13
  const result = findNextOccurrenceInRange(task, now, 7);
  expect(dateKey(result)).toBe('2026-05-13');
});

test('findNextOccurrenceInRange_recurringAllDone_returnsLastOccurrence', () => {
  const task: FileTask = {
    ...withScheduledRepeater('2026-05-12', dailyRepeater),
    doneDates: [
      '2026-05-12',
      '2026-05-13',
      '2026-05-14',
      '2026-05-15',
      '2026-05-16',
      '2026-05-17',
      '2026-05-18',
      '2026-05-19',
    ],
  };
  const result = findNextOccurrenceInRange(task, now, 7);
  expect(dateKey(result)).toBe('2026-05-19');
});

test('findNextOccurrenceInRange_nonRecurringDoneInWindow_returnsBase', () => {
  const task: FileTask = {
    ...withScheduled('2026-05-15'),
    doneDates: ['2026-05-15'],
  };
  const result = findNextOccurrenceInRange(task, now, 7);
  expect(dateKey(result)).toBe('2026-05-15');
});

test('findNextOccurrenceInRange_nonRecurringNotDoneInWindow_returnsBase', () => {
  const task = withScheduled('2026-05-15');
  const result = findNextOccurrenceInRange(task, now, 7);
  expect(dateKey(result)).toBe('2026-05-15');
});

test('findNextOccurrenceInRange_nothingInWindow_returnsUndefined', () => {
  const task = withScheduled('2026-06-15');
  expect(findNextOccurrenceInRange(task, now, 7)).toBeUndefined();
});

// REGRESSION: filter visibility — completed in window stays visible

// REGRESSION: Bug 4 — task completed-for-tomorrow should be visible in Tomorrow filter
test('isTomorrow_taskCompletedOnTomorrow_returnsTrue', () => {
  // User scenario: SCHEDULED advanced past tomorrow,
  // but LOGBOOK has DONE entry on tomorrow → should appear in Tomorrow with checked checkbox
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Test',
    scheduled: {
      date: '2026-05-14',
      active: true,
      hasTime: false,
      start: 0,
      end: 0,
      repeater: { type: '++', value: 1, unit: 'd' },
    },
    doneDates: ['2026-05-12', '2026-05-13'],
  };
  // today = 2026-05-12, tomorrow = 2026-05-13
  // doneDates includes 2026-05-13 → isTomorrow should be true
  expect(isTomorrow(task, now)).toBe(true);
});

test('isTomorrow_taskNotCompletedOnTomorrow_returnsFalse', () => {
  // Negative: doneDates only for today, not tomorrow → not in Tomorrow
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Task',
    scheduled: {
      date: '2026-05-15',
      active: true,
      hasTime: false,
      start: 0,
      end: 0,
      repeater: { type: '+', value: 1, unit: 'd' },
    },
    doneDates: ['2026-05-12'],
  };
  expect(isTomorrow(task, now)).toBe(false);
});

// NEW: getOccurrencesInRange — collect all occurrence dates in window

// NEW: getFirstUnfinishedOccurrence — first occurrence not in doneDates

test('isOverdue_returnsTrue_forPastScheduledDate', () => {
  expect(isOverdue(withScheduled('2026-05-11'), now)).toBe(true);
});

test('isOverdue_returnsFalse_forToday', () => {
  expect(isOverdue(withScheduled('2026-05-12'), now)).toBe(false);
});

test('isOverdue_returnsFalse_forFutureDate', () => {
  expect(isOverdue(withScheduled('2026-05-13'), now)).toBe(false);
});

// REGRESSION: Bug 3 — viewing Tomorrow on task completed today: checkbox should be unchecked
test('isCompletedOn_taskWithDoneOnSameDate_returnsTrue', () => {
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Task',
    doneDates: ['2026-05-12', '2026-05-14'],
  };
  expect(isCompletedOn(task, new Date('2026-05-14T12:00:00'))).toBe(true);
  expect(isCompletedOn(task, new Date('2026-05-12T12:00:00'))).toBe(true);
});

test('isCompletedOn_taskWithoutDoneOnViewDate_returnsFalse', () => {
  // bug from user: task completed today, viewing tomorrow — must be unchecked
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Task',
    doneDates: ['2026-05-14'],
  };
  expect(isCompletedOn(task, new Date('2026-05-15T12:00:00'))).toBe(false);
  expect(isCompletedOn(task, new Date('2026-05-13T12:00:00'))).toBe(false);
});

test('isCompletedOn_taskWithoutDoneDates_returnsFalse', () => {
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Task',
  };
  expect(isCompletedOn(task, new Date('2026-05-14T12:00:00'))).toBe(false);
});

test('isCompletedOn_taskWithEmptyDoneDates_returnsFalse', () => {
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Task',
    doneDates: [],
  };
  expect(isCompletedOn(task, new Date('2026-05-14T12:00:00'))).toBe(false);
});

// REGRESSION: Bug 1 — DONE tasks should NOT appear in Overdue
test('isOverdue_doneTaskWithPastDate_returnsFalse', () => {
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'done',
    text: 'Done task',
    scheduled: { date: '2026-05-10', active: true, hasTime: false, start: 0, end: 0 },
  };
  expect(isOverdue(task, now)).toBe(false);
});

test('isOverdue_doneTaskWithDeadlinePast_returnsFalse', () => {
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'done',
    text: 'Done task',
    deadline: { date: '2026-05-10', active: true, hasTime: false, start: 0, end: 0 },
  };
  expect(isOverdue(task, now)).toBe(false);
});

// REGRESSION: Bug 2 — recurring task completed today should stay visible in Today/Next7Days
test('isToday_recurringCompletedToday_advancedScheduled_returnsTrue', () => {
  // After DONE: scheduled advanced to tomorrow, lastDoneAt = today
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Daily task',
    scheduled: {
      date: '2026-05-13',
      active: true,
      hasTime: false,
      start: 0,
      end: 0,
      repeater: dailyRepeater,
    },
    lastDoneAt: '2026-05-12',
  };
  expect(isToday(task, now)).toBe(true);
});

test('isTomorrow_recurringCompletedToday_advancedToTomorrow_returnsTrue', () => {
  // base = tomorrow → projection occurrence есть на завтра, не зависит от lastDoneAt
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Daily task',
    scheduled: {
      date: '2026-05-13',
      active: true,
      hasTime: false,
      start: 0,
      end: 0,
      repeater: dailyRepeater,
    },
    lastDoneAt: '2026-05-12',
  };
  expect(isTomorrow(task, now)).toBe(true);
});

test('isOverdue_returnsFalse_forTaskWithoutDate', () => {
  expect(isOverdue(noDateTask, now)).toBe(false);
});

test('isOverdue_usesDeadline_whenNoScheduled', () => {
  expect(isOverdue(withDeadline('2026-05-10'), now)).toBe(true);
});

test('isOverdue_usesDeadlineFirst_evenWhenScheduledIsFuture', () => {
  expect(isOverdue(withBoth('2026-05-13', '2026-05-11'), now)).toBe(true);
});

test('isOverdue_recurringWithPastBase_returnsTrue', () => {
  expect(isOverdue(withScheduledRepeater('2020-01-01', dailyRepeater), utcNoon('2026-05-13'))).toBe(
    true,
  );
});

test('isToday_returnsTrue_forToday', () => {
  expect(isToday(withScheduled('2026-05-12'), now)).toBe(true);
});

test('isToday_returnsTrue_forYesterdayNonRecurring_dueToOverdueRule', () => {
  expect(isToday(withScheduled('2026-05-11'), now)).toBe(true);
});

test('isToday_usesScheduledFirst_whenBothPresent', () => {
  expect(isToday(withBoth('2026-05-12', '2026-05-15'), now)).toBe(true);
});

test('isToday_fallsBackToDeadline_whenNoScheduled', () => {
  expect(isToday(withDeadline('2026-05-12'), now)).toBe(true);
});

test('isToday_recurringDailyFromOldBase_returnsTrue', () => {
  expect(isToday(withScheduledRepeater('2020-01-01', dailyRepeater), utcNoon('2026-05-13'))).toBe(
    true,
  );
});

test('isToday_recurringEvery2Days_baseMonday_targetWednesday_returnsTrue', () => {
  expect(
    isToday(withScheduledRepeater('2026-05-11', everyTwoDaysRepeater), utcNoon('2026-05-13')),
  ).toBe(true);
});

test('isToday_recurringEvery2Days_targetTuesday_returnsTrue_dueToOverdueRule', () => {
  expect(
    isToday(withScheduledRepeater('2026-05-11', everyTwoDaysRepeater), utcNoon('2026-05-12')),
  ).toBe(true);
});

test('isToday_recurringMonthly_targetSameDayNextMonth_returnsTrue', () => {
  expect(isToday(withScheduledRepeater('2026-04-13', monthlyRepeater), utcNoon('2026-05-13'))).toBe(
    true,
  );
});

test('isTomorrow_returnsTrue_forTomorrow', () => {
  expect(isTomorrow(withScheduled('2026-05-13'), now)).toBe(true);
});

test('isTomorrow_returnsFalse_forToday', () => {
  expect(isTomorrow(withScheduled('2026-05-12'), now)).toBe(false);
});

test('isTomorrow_recurringDailyFromOldBase_returnsTrue', () => {
  expect(
    isTomorrow(withScheduledRepeater('2020-01-01', dailyRepeater), utcNoon('2026-05-13')),
  ).toBe(true);
});

test('isTomorrow_recurringEvery2Days_targetTuesday_returnsFalse', () => {
  expect(
    isTomorrow(withScheduledRepeater('2026-05-11', everyTwoDaysRepeater), utcNoon('2026-05-11')),
  ).toBe(false);
});

test('hasOccurrenceInRange_zeroValueRepeater_doesNotInfiniteLoop', () => {
  expect(
    isTomorrow(withScheduledRepeater('2020-01-01', zeroDayRepeater), utcNoon('2026-05-13')),
  ).toBe(false);
});

test('getActiveDate_returnsDeadlineWhenBothPresent', () => {
  expect(getActiveDate(withBoth('2026-06-01', '2026-05-10'))).toBe('2026-05-10');
});

test('getActiveDate_returnsScheduledWhenOnlyScheduledPresent', () => {
  expect(getActiveDate(withScheduled('2026-05-15'))).toBe('2026-05-15');
});

test('getActiveDate_returnsDeadlineWhenOnlyDeadlinePresent', () => {
  expect(getActiveDate(withDeadline('2026-05-15'))).toBe('2026-05-15');
});

test('isOverdue_returnsTrueWhenDeadlinePastEvenIfScheduledFuture', () => {
  expect(isOverdue(withBoth('2026-06-01', '2026-05-10'), now)).toBe(true);
});

test('hasRepeater_returnsTrue_whenScheduledHasRepeater', () => {
  expect(hasRepeater(withScheduledRepeater('2026-05-12', dailyRepeater))).toBe(true);
});

test('hasRepeater_returnsTrue_whenDeadlineHasRepeater', () => {
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Task',
    deadline: {
      date: '2026-05-12',
      active: true,
      hasTime: false,
      start: 0,
      end: 0,
      repeater: dailyRepeater,
    },
  };
  expect(hasRepeater(task)).toBe(true);
});

test('hasRepeater_returnsFalse_whenNoRepeater', () => {
  expect(hasRepeater(withScheduled('2026-05-12'))).toBe(false);
});

test('hasRepeater_returnsFalse_whenNoDateFields', () => {
  expect(hasRepeater(noDateTask)).toBe(false);
});

// REGRESSION: TODO task previously marked DONE and reverted should not show as checked
// Before fix: isChecked used `state === 'done' || isCompletedOn(...)` causing stale doneDates
// to make a TODO task appear checked, and subsequent toggle would complete instead of reopen.
test('isCompletedOn_todoTaskWithStaleDoneDate_returnsTrueForDate', () => {
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Task',
    doneDates: ['2026-05-12'],
  };
  expect(isCompletedOn(task, now)).toBe(true);
  expect(hasRepeater(task)).toBe(false);
});

test('hasRepeater_falseAndTodoState_means_isCheckedShouldBeFalse', () => {
  const task: FileTask = {
    id: '1',
    kind: 'headline-todo',
    state: 'todo',
    text: 'Task',
    doneDates: ['2026-05-12'],
  };
  const isChecked = task.state === 'done' || (hasRepeater(task) && isCompletedOn(task, now));
  expect(isChecked).toBe(false);
});

test('findTaskDateInRange returns a task date inside inclusive bounds', () => {
  const task = withScheduled('2026-05-15');

  const result = findTaskDateInRange(task, utcNoon('2026-05-14'), utcNoon('2026-05-16'));

  expect(dateKey(result)).toBe('2026-05-15');
});

test('findTaskDateInRange skips a completed timestamp occurrence in favor of the next day', () => {
  const task: FileTask = {
    ...withScheduledRepeater('2026-05-15', dailyRepeater),
    doneDates: ['2026-05-15T18:30:00'],
  };

  const result = findTaskDateInRange(task, utcNoon('2026-05-15'), utcNoon('2026-05-16'));

  expect(dateKey(result)).toBe('2026-05-16');
});

test('findTaskDateInRange returns a recorded completion after a repeater advances', () => {
  const task: FileTask = {
    ...withScheduledRepeater('2026-05-20', dailyRepeater),
    doneDates: ['2026-05-15'],
  };

  const result = findTaskDateInRange(task, utcNoon('2026-05-14'), utcNoon('2026-05-16'));

  expect(dateKey(result)).toBe('2026-05-15');
});
