import { expect, test, vi } from 'vitest';
import type { OrgNoteApi } from 'orgnote-api';
import { seedDemoNotes } from './seed-demo-notes';

const createApi = (writeFile: (path: string[], content: string) => Promise<void>): OrgNoteApi =>
  ({
    core: {
      useFileSystem: () => ({
        writeFile,
      }),
    },
  }) as unknown as OrgNoteApi;

test('seedDemoNotes writes 600 generated org files into demo generated folder', async () => {
  const writeFile = vi.fn(async () => undefined);
  const api = createApi(writeFile);

  await seedDemoNotes(api);

  expect(writeFile).toHaveBeenCalledTimes(600);
  expect(writeFile).toHaveBeenNthCalledWith(
    1,
    ['demo', 'generated', 'demo-0001.org'],
    expect.stringContaining('#+TITLE:'),
  );
});

test('seedDemoNotes generates tags, actions, and optional links in content', async () => {
  const writes: Array<{ path: string[]; content: string }> = [];
  const writeFile = vi.fn(async (path: string[], content: string) => {
    writes.push({ path, content });
  });
  const api = createApi(writeFile);

  await seedDemoNotes(api);

  const withLinks = writes.find((entry) => entry.content.includes('[[id:'));
  const withoutLinks = writes.find((entry) => entry.content.includes('- No explicit links yet'));

  expect(withLinks?.content).toContain('#+FILETAGS: :');
  expect(withLinks?.content).toContain('* Actions');
  expect(withLinks?.content).toContain('** TODO ');
  expect(withoutLinks?.content).toContain('* Related');
});
