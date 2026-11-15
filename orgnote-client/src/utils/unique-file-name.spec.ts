import { expect, test } from 'vitest';
import { getUniqueFileName } from './unique-file-name';

test('should return unique name', () => {
  const fileName = getUniqueFileName(['Untitled-note.org']);

  expect(fileName).toMatchSnapshot();
});

test('Should return unique name with multiple default names', () => {
  const fileNames = ['Untitled-note.org', 'Untitled-note-1.org', 'Untitled-note-2.org'];
  const fileName = getUniqueFileName(fileNames);
  expect(fileName).toMatchSnapshot();
});
