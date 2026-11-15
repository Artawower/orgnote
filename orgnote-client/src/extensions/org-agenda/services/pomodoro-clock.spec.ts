import { expect, test, vi } from 'vitest';
import { createAtomicFileContent } from '../../../../test/mocks/atomic-file-content';
import type { ActiveSession } from './pomodoro-session';

const TASK_FILE = '/agenda/tasks.org';
const shiftedContent = '* DONE One\nCLOSED: [2026-05-13 Wed 09:00]\n* TODO Two\n';
const fileContent = createAtomicFileContent({ [TASK_FILE]: shiftedContent });

vi.mock('src/boot/api', () => ({ api: { core: { useFileContent: () => fileContent } } }));
vi.mock('src/boot/report', () => ({ reporter: { reportError: vi.fn(), reportWarning: vi.fn() } }));

const { writeSessionClock } = await import('./pomodoro-clock');

test('writeSessionClock does not attach a clock to another task after its task moved', async () => {
  const session: ActiveSession = {
    taskId: 'two',
    taskText: 'Two',
    filePath: TASK_FILE,
    taskStart: '* TODO One\n'.length,
    segmentStartedAt: new Date(2026, 4, 13, 9).toISOString(),
    accumulatedSeconds: 0,
    duration: 1500,
    type: 'pomo',
    paused: false,
  };

  const result = await writeSessionClock(session, new Date(2026, 4, 13, 9, 25));

  expect(result.wasWritten).toBe(false);
  expect(fileContent.readText(TASK_FILE)).toBe(shiftedContent);
});
