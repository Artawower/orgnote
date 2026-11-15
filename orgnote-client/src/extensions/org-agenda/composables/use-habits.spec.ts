import { expect, test } from 'vitest';
import type { ClockEntry } from 'org-mode-ast';
import type { AgendaHabitView } from '../types';
import { buildHabitView, buildWeekDays, getCompletionLevel } from './use-habits';

const NOW = new Date('2026-05-20T10:00:00Z');

const clock = (date: string): ClockEntry => ({ date, start: 0, end: 10 });

const habit = (clocks: ClockEntry[], id = 'h1'): AgendaHabitView => ({
  id,
  text: 'Exercise',
  kind: 'headline-todo',
  state: 'todo',
  start: 0,
  end: 10,
  isHabit: true,
  clocks,
  filePath: '/habits.org',
  fileTitle: 'Habits',
  totalDays: 0,
  currentStreak: 0,
  completedToday: false,
});

test('buildHabitView_includesTotalDays_fromClocks', () => {
  const result = buildHabitView(
    habit([clock('2026-05-18'), clock('2026-05-20')]),
    '/habits.org',
    'Habits',
    NOW,
  );
  expect(result.totalDays).toBe(2);
});

test('buildHabitView_includesCurrentStreak_fromClocks', () => {
  const result = buildHabitView(
    habit([clock('2026-05-18'), clock('2026-05-19'), clock('2026-05-20')]),
    '/habits.org',
    'Habits',
    NOW,
  );
  expect(result.currentStreak).toBe(3);
});

test('buildHabitView_completedToday_whenClockMatchesToday', () => {
  const result = buildHabitView(habit([clock('2026-05-20')]), '/habits.org', 'Habits', NOW);
  expect(result.completedToday).toBe(true);
});

test('buildHabitView_notCompletedToday_whenNoClockToday', () => {
  const result = buildHabitView(habit([clock('2026-05-19')]), '/habits.org', 'Habits', NOW);
  expect(result.completedToday).toBe(false);
});

test('buildHabitView_completedToday_false_whenClocksEmpty', () => {
  const result = buildHabitView(habit([]), '/habits.org', 'Habits', NOW);
  expect(result.completedToday).toBe(false);
});

test('getCompletionLevel_returnsNone_whenZeroCompleted', () => {
  expect(getCompletionLevel(0, 3)).toBe('none');
});

test('getCompletionLevel_returnsNone_whenTotalIsZero', () => {
  expect(getCompletionLevel(1, 0)).toBe('none');
});

test('getCompletionLevel_returnsFull_whenAllCompleted', () => {
  expect(getCompletionLevel(3, 3)).toBe('full');
});

test('getCompletionLevel_returnsPartial_whenSomeCompleted', () => {
  expect(getCompletionLevel(1, 3)).toBe('partial');
});

test('buildWeekDays_returnsSevenDays', () => {
  expect(buildWeekDays([], NOW)).toHaveLength(7);
});

test('buildWeekDays_startsMondayThisWeek', () => {
  const [firstDay] = buildWeekDays([], NOW);
  expect(firstDay?.date).toBe('2026-05-18');
  expect(firstDay?.dayLabel).toBe('Mon');
});

test('buildWeekDays_marksTodayCorrectly', () => {
  const today = buildWeekDays([], NOW).find((day) => day.isToday);
  expect(today?.date).toBe('2026-05-20');
});

test('buildWeekDays_computesFullCompletion_whenAllHabitsHaveClockThatDay', () => {
  const habits = [habit([clock('2026-05-18')], 'h1'), habit([clock('2026-05-18')], 'h2')];
  const [monday] = buildWeekDays(habits, NOW);
  expect(monday?.completionLevel).toBe('full');
  expect(monday?.completionRatio).toBe(1);
});

test('buildWeekDays_computesPartialCompletion', () => {
  const habits = [habit([clock('2026-05-19')], 'h1'), habit([], 'h2')];
  const tuesday = buildWeekDays(habits, NOW).find((day) => day.date === '2026-05-19');
  expect(tuesday?.completionLevel).toBe('partial');
  expect(tuesday?.completionRatio).toBe(0.5);
});

test('buildWeekDays_completionRatioZero_whenNoHabits', () => {
  const [monday] = buildWeekDays([], NOW);
  expect(monday?.completionRatio).toBe(0);
});

test('buildWeekDays_completionRatioZero_whenNoneCompleted', () => {
  const habits = [habit([], 'h1'), habit([], 'h2')];
  const [monday] = buildWeekDays(habits, NOW);
  expect(monday?.completionRatio).toBe(0);
});
