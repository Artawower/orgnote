import { expect, test } from 'vitest';
import { normalizeOrgFilePath } from './normalize-org-file-path';

test('normalizeOrgFilePath appends org extension when file has no extension', () => {
  expect(normalizeOrgFilePath('/notes/new-note')).toBe('/notes/new-note.org');
});

test('normalizeOrgFilePath keeps org and gpg org files unchanged', () => {
  expect(normalizeOrgFilePath('/notes/new-note.org')).toBe('/notes/new-note.org');
  expect(normalizeOrgFilePath('/notes/new-note.org.gpg')).toBe('/notes/new-note.org.gpg');
});

test('normalizeOrgFilePath keeps directories and non-org files unchanged', () => {
  expect(normalizeOrgFilePath('/notes/')).toBe('/notes/');
  expect(normalizeOrgFilePath('/notes/file.md')).toBe('/notes/file.md');
});
