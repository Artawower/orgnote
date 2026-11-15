import { expect, test } from 'vitest';
import { reopenTask } from './reopen-task';

const reopenedAt = new Date(2026, 4, 13, 12, 34);
const logLine = '- State "TODO" from "DONE" [2026-05-13 Wed 12:34]';

test('reopenTask_removesClosedAndRecordsStateChange', () => {
  const content = '* DONE Task\nCLOSED: [2026-05-12 Tue 09:00] SCHEDULED: <2026-05-13 Wed>\nBody\n';

  expect(reopenTask(content, 0, reopenedAt)).toBe(
    `* TODO Task\nSCHEDULED: <2026-05-13 Wed>\n:LOGBOOK:\n${logLine}\n:END:\nBody\n`,
  );
});

test('reopenTask_noClosedNoLogbook_handlesGracefully', () => {
  const content = '* DONE Task\nBody\n';
  const result = reopenTask(content, 0, reopenedAt);

  expect(result).toContain('TODO');
  expect(result).toContain(':LOGBOOK:');
});
