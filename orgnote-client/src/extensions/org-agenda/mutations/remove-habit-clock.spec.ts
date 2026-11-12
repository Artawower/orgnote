import { expect, test } from 'vitest';
import { removeHabitClock } from './remove-habit-clock';

const habitWithClock = `* TODO Drink water
   SCHEDULED: <2026-05-25 Mon .+1d>
:LOGBOOK:
CLOCK: [2026-05-20 Wed 10:00]--[2026-05-20 Wed 10:00] =>  0:00
:END:
   :PROPERTIES:
   :STYLE:    habit
   :END:
`;

test('removeHabitClock_removesClock_forMatchingDate', () => {
  const result = removeHabitClock(habitWithClock, 0, '2026-05-20');
  expect(result).not.toContain('CLOCK: [2026-05-20');
});

test('removeHabitClock_preservesLogbookStructure_afterRemoval', () => {
  const result = removeHabitClock(habitWithClock, 0, '2026-05-20');
  expect(result).toContain(':LOGBOOK:');
  expect(result).toContain(':END:');
});

test('removeHabitClock_preservesOtherClocks_whenDifferentDate', () => {
  const docWithMultipleClocks = `* TODO Drink water
   SCHEDULED: <2026-05-25 Mon .+1d>
:LOGBOOK:
CLOCK: [2026-05-19 Tue 10:00]--[2026-05-19 Tue 10:00] =>  0:00
CLOCK: [2026-05-20 Wed 10:00]--[2026-05-20 Wed 10:00] =>  0:00
:END:
   :PROPERTIES:
   :STYLE:    habit
   :END:
`;
  const result = removeHabitClock(docWithMultipleClocks, 0, '2026-05-20');
  expect(result).toContain('2026-05-19');
  expect(result).not.toContain('2026-05-20');
});

test('removeHabitClock_returnsInput_whenNoMatchingClock', () => {
  expect(removeHabitClock(habitWithClock, 0, '2026-05-21')).toBe(habitWithClock);
});

test('removeHabitClock_returnsInput_whenHeadlineNotFound', () => {
  expect(removeHabitClock(habitWithClock, 999, '2026-05-20')).toBe(habitWithClock);
});

test('removeHabitClock_onlyModifiesTargetHeadline_withOffset', () => {
  const twoHabits = `* TODO First habit
:LOGBOOK:
CLOCK: [2026-05-20 Wed 10:00]--[2026-05-20 Wed 10:00] =>  0:00
:END:
* TODO Second habit
:LOGBOOK:
CLOCK: [2026-05-20 Wed 10:00]--[2026-05-20 Wed 10:00] =>  0:00
:END:
`;
  const secondStart = twoHabits.indexOf('* TODO Second habit');
  const result = removeHabitClock(twoHabits, secondStart, '2026-05-20');
  expect(result).toContain('* TODO First habit');
  const firstClockLine = result.split('\n').find((l) => l.includes('2026-05-20'));
  expect(firstClockLine).toBeDefined();
  const secondIdx = result.indexOf('* TODO Second habit');
  expect(result.indexOf('2026-05-20')).toBeLessThan(secondIdx);
});
