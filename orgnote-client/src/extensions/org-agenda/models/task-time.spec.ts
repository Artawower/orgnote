import { expect, test } from 'vitest';
import { createAgendaTaskClockRange } from './task-time';

test('explicit start after midnight uses the previous calendar day', () => {
  const currentTime = new Date(2026, 4, 15, 0, 30);

  const range = createAgendaTaskClockRange(
    { hours: 1, minutes: 0, startTime: '23:00' },
    currentTime,
  );

  expect(range.startedAt).toEqual(new Date(2026, 4, 14, 23, 0));
  expect(range.endedAt).toEqual(new Date(2026, 4, 15, 0, 0));
});
