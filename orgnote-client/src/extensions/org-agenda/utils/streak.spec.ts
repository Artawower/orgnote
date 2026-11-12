import { expect, test } from 'vitest';
import { calcTotalDays, calcCurrentStreak } from './streak';
import type { ClockEntry } from 'org-mode-ast';

const clock = (date: string): ClockEntry => ({ date, start: 0, end: 0 });

test('calcTotalDays_returnsZero_forEmptyClocks', () => {
  expect(calcTotalDays([])).toBe(0);
});

test('calcTotalDays_countsUniqueDays_ignoringTimePart', () => {
  const clocks = [clock('2026-05-10T10:00'), clock('2026-05-10T14:00'), clock('2026-05-11T09:00')];
  expect(calcTotalDays(clocks)).toBe(2);
});

test('calcTotalDays_ignoresClocksWithoutDate', () => {
  expect(calcTotalDays([{ start: 0, end: 0 }, clock('2026-05-10T10:00')])).toBe(1);
});

test('calcCurrentStreak_returnsZero_forEmptyClocks', () => {
  expect(calcCurrentStreak([], new Date('2026-05-12'))).toBe(0);
});

test('calcCurrentStreak_returnsZero_whenLatestClockOlderThanYesterday', () => {
  expect(calcCurrentStreak([clock('2026-05-09T10:00')], new Date('2026-05-12'))).toBe(0);
});

test('calcCurrentStreak_returnsOne_whenOnlyTodayHasClock', () => {
  expect(calcCurrentStreak([clock('2026-05-12T10:00')], new Date('2026-05-12'))).toBe(1);
});

test('calcCurrentStreak_returnsStreak_forConsecutiveDaysEndingToday', () => {
  const clocks = [clock('2026-05-10T10:00'), clock('2026-05-11T10:00'), clock('2026-05-12T10:00')];
  expect(calcCurrentStreak(clocks, new Date('2026-05-12'))).toBe(3);
});

test('calcCurrentStreak_returnsStreak_forConsecutiveDaysEndingYesterday', () => {
  const clocks = [clock('2026-05-09T10:00'), clock('2026-05-10T10:00'), clock('2026-05-11T10:00')];
  expect(calcCurrentStreak(clocks, new Date('2026-05-12'))).toBe(3);
});

test('calcCurrentStreak_stopsStreak_atFirstGap', () => {
  const clocks = [
    clock('2026-05-08T10:00'),
    clock('2026-05-10T10:00'),
    clock('2026-05-11T10:00'),
    clock('2026-05-12T10:00'),
  ];
  expect(calcCurrentStreak(clocks, new Date('2026-05-12'))).toBe(3);
});
