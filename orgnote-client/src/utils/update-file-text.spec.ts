import type { FileContent, FileContentTransform } from 'orgnote-api';
import { expect, test, vi } from 'vitest';
import { updateFileText } from './update-file-text';

const createFileContent = (initialText: string) => {
  let stored = new TextEncoder().encode(initialText);
  const write = vi.fn();
  const fileContent: FileContent = {
    read: vi.fn(async () => stored),
    write,
    update: async (_path: string, transform: FileContentTransform) => {
      const next = await transform(stored);
      if (!next) return false;
      stored = next;
      write(_path, next);
      return true;
    },
  };
  return { fileContent, write, readText: () => new TextDecoder().decode(stored) };
};

test('updateFileText writes the mutated text', async () => {
  const { fileContent, readText } = createFileContent('* TODO task');

  const isWritten = await updateFileText(fileContent, '/work.org', (text) => text.replace('TODO', 'DONE'));

  expect(isWritten).toBe(true);
  expect(readText()).toBe('* DONE task');
});

test('updateFileText does not write when the mutation keeps the text unchanged', async () => {
  const { fileContent, write } = createFileContent('* TODO task');

  const isWritten = await updateFileText(fileContent, '/work.org', (text) => text);

  expect(isWritten).toBe(false);
  expect(write).not.toHaveBeenCalled();
});
