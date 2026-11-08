import { expect, test } from 'vitest';
import { undoRecurringCompletion } from './undo-recurring-completion';

test('undoRecurringCompletion_removesTodayDoneEntry_andRewindsScheduled', () => {
  const content =
    '* TODO Daily\nSCHEDULED: <2026-05-14 Thu +1d>\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 14:30]\n:END:\nBody\n';

  const result = undoRecurringCompletion(content, 0, '2026-05-13');

  expect(result).toBeDefined();
  expect(result).not.toContain('State "DONE"');
  expect(result).toContain('SCHEDULED: <2026-05-13');
  expect(result).not.toContain('SCHEDULED: <2026-05-14');
});

test('undoRecurringCompletion_missingEntry_keepsContentUnchanged', () => {
  const content =
    '* TODO Daily\nSCHEDULED: <2026-05-14 Thu +1d>\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-12 Tue 14:30]\n:END:\nBody\n';

  const result = undoRecurringCompletion(content, 0, '2026-05-13');

  expect(result).toBe(content);
});

test('undoRecurringCompletion_selectiveRemoval_keepsOtherEntries', () => {
  const content =
    '* TODO Daily\nSCHEDULED: <2026-05-14 Thu +1d>\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 14:30]\n- State "DONE" from "TODO" [2026-05-12 Tue 10:00]\n:END:\nBody\n';

  const result = undoRecurringCompletion(content, 0, '2026-05-13');

  expect(result).toContain('[2026-05-12 Tue 10:00]');
  expect(result).not.toContain('[2026-05-13 Wed 14:30]');
  expect(result).toContain('SCHEDULED: <2026-05-13');
});

test('undoRecurringCompletion_noLogbook_keepsContentUnchanged', () => {
  const content = '* TODO Daily\nSCHEDULED: <2026-05-14 Thu +1d>\nBody\n';

  const result = undoRecurringCompletion(content, 0, '2026-05-13');

  expect(result).toBe(content);
});

test('undoRecurringCompletion_unknownHeadlineOffset_keepsContentUnchanged', () => {
  const content =
    '* TODO Daily\nSCHEDULED: <2026-05-14 Thu +1d>\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 14:30]\n:END:\nBody\n';

  const result = undoRecurringCompletion(content, 9999, '2026-05-13');

  expect(result).toBe(content);
});
