import type { OrgNoteApi } from 'orgnote-api';
import { expect, test, vi } from 'vitest';
import { createAtomicFileContent } from '../../../../test/mocks/atomic-file-content';
import { setTaskPriorityCommand } from './set-task-priority-command';

vi.mock('src/boot/report', () => ({ reporter: { reportError: vi.fn() } }));
vi.mock('src/boot/i18n', () => ({ i18n: { global: { t: (key: string) => key } } }));
vi.mock('src/utils/org-priority-completion', () => ({
  openOrgPriorityCompletion: vi.fn(async () => 'A'),
}));

const TASK_FILE = '/agenda/tasks.org';

test('setTaskPriorityCommand sets the priority through an atomic file update', async () => {
  const fileContent = createAtomicFileContent({ [TASK_FILE]: '* TODO Buy milk\n' });
  const api = { core: { useFileContent: () => fileContent } } as unknown as OrgNoteApi;

  await setTaskPriorityCommand.handler(api, {
    meta: setTaskPriorityCommand,
    data: { id: 'buy-milk', filePath: TASK_FILE, start: 0, text: 'Buy milk' },
  });

  expect(fileContent.readText(TASK_FILE)).toBe('* TODO [#A] Buy milk\n');
});
