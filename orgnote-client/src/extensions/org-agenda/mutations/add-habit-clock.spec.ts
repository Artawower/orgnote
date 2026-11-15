import { expect, test } from 'vitest';
import { addHabitClock } from './add-habit-clock';

const habitDoc = `* TODO Drink water
   SCHEDULED: <2026-05-25 Mon .+1d>
   :PROPERTIES:
   :STYLE:    habit
   :END:
`;

const date = new Date('2026-05-20T10:00:00');

test('addHabitClock_appendsClock_toExistingLogbook', () => {
  const docWithLogbook = `* TODO Drink water
   SCHEDULED: <2026-05-25 Mon .+1d>
:LOGBOOK:
CLOCK: [2026-05-19 Tue 10:00]--[2026-05-19 Tue 10:00] =>  0:00
:END:
   :PROPERTIES:
   :STYLE:    habit
   :END:
`;
  const result = addHabitClock(docWithLogbook, 0, date);
  expect(result).toContain('2026-05-20');
  expect(result).toContain('2026-05-19');
});

test('addHabitClock_createsLogbook_whenAbsent', () => {
  const result = addHabitClock(habitDoc, 0, date);
  expect(result).toContain(':LOGBOOK:');
  expect(result).toContain('CLOCK:');
  expect(result).toContain('2026-05-20');
  expect(result).toContain(':END:');
});

test('addHabitClock_doesNotAdvanceScheduledDate', () => {
  const result = addHabitClock(habitDoc, 0, date);
  expect(result).toContain('2026-05-25');
});

test('addHabitClock_doesNotChangeTodoKeyword', () => {
  const result = addHabitClock(habitDoc, 0, date);
  expect(result).toContain('* TODO Drink water');
});

test('addHabitClock_returnsInput_whenHeadlineNotFound', () => {
  expect(addHabitClock(habitDoc, 999, date)).toBe(habitDoc);
});
