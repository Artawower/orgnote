import type { OrgNoteApi } from 'orgnote-api';
import { expect, test, vi } from 'vitest';
import { createAtomicFileContent } from '../../../../test/mocks/atomic-file-content';
import { deleteTaskCommand } from './delete-task-command';

vi.mock('src/boot/report', () => ({ reporter: { reportError: vi.fn() } }));

const TASK_FILE = '/agenda/tasks.org';

test('deleteTaskCommand removes the task through an atomic file update', async () => {
  const fileContent = createAtomicFileContent({ [TASK_FILE]: '* TODO Buy milk\n* TODO Walk dog\n' });
  const api = { core: { useFileContent: () => fileContent } } as unknown as OrgNoteApi;

  await deleteTaskCommand.handler(api, {
    meta: deleteTaskCommand,
    data: { id: 'buy-milk', filePath: TASK_FILE, start: 0 },
  });

  expect(fileContent.readText(TASK_FILE)).toBe('* TODO Walk dog\n');
});
