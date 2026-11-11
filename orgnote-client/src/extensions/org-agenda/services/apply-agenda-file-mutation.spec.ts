import type { OrgNoteApi } from 'orgnote-api';
import { expect, test, vi } from 'vitest';
import { createAtomicFileContent } from '../../../../test/mocks/atomic-file-content';
import { applyAgendaFileMutation } from './apply-agenda-file-mutation';

const reportError = vi.hoisted(() => vi.fn());
vi.mock('src/boot/report', () => ({ reporter: { reportError } }));

const TASK_FILE = '/agenda/tasks.org';

const createApi = (fileContent: ReturnType<typeof createAtomicFileContent>) =>
  ({ core: { useFileContent: () => fileContent } }) as unknown as OrgNoteApi;

test('applyAgendaFileMutation writes through an atomic update and returns both contents', async () => {
  const fileContent = createAtomicFileContent({ [TASK_FILE]: '* TODO task\n' });

  const result = await applyAgendaFileMutation(createApi(fileContent), TASK_FILE, (content) =>
    content.replace('TODO', 'DONE'),
  );

  expect(result).toEqual({
    wasWritten: true,
    previousContent: '* TODO task\n',
    content: '* DONE task\n',
  });
  expect(fileContent.readText(TASK_FILE)).toBe('* DONE task\n');
});

test('applyAgendaFileMutation reports nothing written for an unchanged file', async () => {
  const fileContent = createAtomicFileContent({ [TASK_FILE]: '* TODO task\n' });

  const result = await applyAgendaFileMutation(createApi(fileContent), TASK_FILE, (content) => content);

  expect(result).toEqual({ wasWritten: false });
});

test('applyAgendaFileMutation reports a failing mutation without writing', async () => {
  const fileContent = createAtomicFileContent({ [TASK_FILE]: '* TODO task\n' });
  const failure = new Error('mutation failed');

  const result = await applyAgendaFileMutation(createApi(fileContent), TASK_FILE, () => {
    throw failure;
  });

  expect(result).toEqual({ wasWritten: false });
  expect(fileContent.readText(TASK_FILE)).toBe('* TODO task\n');
  expect(reportError).toHaveBeenCalledWith(failure);
});
