import type { OrgNoteApi } from 'orgnote-api';
import { expect, test, vi } from 'vitest';
import { createAtomicFileContent } from '../../../../test/mocks/atomic-file-content';
import { applyAgendaFileMutation } from './apply-agenda-file-mutation';

const { reportError, reportWarning } = vi.hoisted(() => ({
  reportError: vi.fn(),
  reportWarning: vi.fn(),
}));
vi.mock('src/boot/report', () => ({ reporter: { reportError, reportWarning } }));

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

test('applyAgendaFileMutation rejects an edit whose target task moved before it was applied', async () => {
  const fileContent = createAtomicFileContent({ [TASK_FILE]: '* TODO One\n* TODO Two\n* TODO Three\n' });
  const api = createApi(fileContent);
  const twoStart = '* TODO One\n'.length;

  const results = await Promise.all([
    applyAgendaFileMutation(api, TASK_FILE, (text) => text.replace('* TODO One\n', ''), {
      targetTask: { start: 0, text: 'One' },
    }),
    applyAgendaFileMutation(
      api,
      TASK_FILE,
      (text) => `${text.slice(0, twoStart)}* TODO Renamed\n${text.slice(twoStart + '* TODO Two\n'.length)}`,
      { targetTask: { start: twoStart, text: 'Two' } },
    ),
  ]);

  expect(results.map((result) => result.wasWritten)).toEqual([true, false]);
  expect(fileContent.readText(TASK_FILE)).toBe('* TODO Two\n* TODO Three\n');
  expect(reportWarning).toHaveBeenCalledOnce();
});
