import { expect, test } from 'vitest';
import { completeRepeatingTask } from './complete-repeating-task';

const completedAt = new Date(2026, 4, 13, 12, 34);
const logLine = '- State "DONE" from "WAIT" [2026-05-13 Wed 12:34]';

test('completeRepeatingTask_advancesRepeaterAndRecordsStateChange', () => {
  const content = '* WAIT Task\nSCHEDULED: <2026-05-13 Wed +1d>\nBody\n';

  expect(completeRepeatingTask(content, 0, completedAt)).toBe(
    `* TODO Task\nSCHEDULED: <2026-05-14 Thu +1d>\n:LOGBOOK:\n${logLine}\n:END:\nBody\n`,
  );
});

test('completeRepeatingTask_noLogbook_createsLogbook', () => {
  const content = '* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\nBody\n';
  const result = completeRepeatingTask(content, 0, completedAt);

  expect(result).toContain(':LOGBOOK:');
  expect(result).toContain('SCHEDULED: <2026-05-14');
});

test('completeRepeatingTask_withRetroactiveCompletedAt_writesPastTimestamp', () => {
  const content = '* TODO Daily\nSCHEDULED: <2026-05-15 Fri +1d>\n';
  const pastDate = new Date(2026, 4, 13, 12, 0);
  const result = completeRepeatingTask(content, 0, pastDate);

  expect(result).toContain('[2026-05-13');
});

test('completeRepeatingTask_withFutureCompletedAt_writesFutureTimestamp', () => {
  const content = '* TODO Daily\nSCHEDULED: <2026-05-15 Fri +1d>\n';
  const futureDate = new Date(2026, 4, 20, 12, 0);
  const result = completeRepeatingTask(content, 0, futureDate);

  expect(result).toContain('[2026-05-20');
});
