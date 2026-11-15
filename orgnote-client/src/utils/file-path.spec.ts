import { expect, test } from 'vitest';
import { fileBaseName } from './file-path';

test('fileBaseName_stripsOrgExtension', () => {
  expect(fileBaseName('/notes/inbox.org')).toBe('inbox');
});

test('fileBaseName_returnsName_withoutExtension', () => {
  expect(fileBaseName('/notes/readme.md')).toBe('readme.md');
});

test('fileBaseName_handlesRootFile', () => {
  expect(fileBaseName('inbox.org')).toBe('inbox');
});

test('fileBaseName_handlesPathWithNoSlash', () => {
  expect(fileBaseName('notes')).toBe('notes');
});
