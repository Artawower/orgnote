import { expect, test } from 'vitest';
import type { FileSystemChange } from 'orgnote-api';
import { affectsOrgIndex } from './org-fs-change';

const change = (
  type: FileSystemChange['type'],
  path: string,
  previousPath?: string,
): FileSystemChange => ({ type, path, previousPath });

test('affectsOrgIndex is true for org file create/modify', () => {
  expect(affectsOrgIndex(change('create', '/notes/a.org'))).toBe(true);
  expect(affectsOrgIndex(change('modify', '/notes/a.org'))).toBe(true);
});

test('affectsOrgIndex is false for non-org file create/modify', () => {
  expect(affectsOrgIndex(change('create', '/assets/img.png'))).toBe(false);
  expect(affectsOrgIndex(change('modify', '/tmp/scratch.txt'))).toBe(false);
});

test('affectsOrgIndex is true for org file deletion', () => {
  expect(affectsOrgIndex(change('delete', '/notes/a.org'))).toBe(true);
});

test('affectsOrgIndex is false for non-org file deletion', () => {
  expect(affectsOrgIndex(change('delete', '/assets/img.png'))).toBe(false);
  expect(affectsOrgIndex(change('delete', '/notes/archive.tar.gz'))).toBe(false);
});

test('affectsOrgIndex is true for directory deletion', () => {
  expect(affectsOrgIndex(change('delete', '/folder'))).toBe(true);
  expect(affectsOrgIndex(change('delete', '/notes/sub'))).toBe(true);
});

test('affectsOrgIndex handles renames by org membership or directory shape', () => {
  expect(affectsOrgIndex(change('rename', '/notes/b.org', '/notes/a.org'))).toBe(true);
  expect(affectsOrgIndex(change('rename', '/notes/a.txt', '/notes/a.org'))).toBe(true);
  expect(affectsOrgIndex(change('rename', '/python', '/markdown/python'))).toBe(true);
  expect(affectsOrgIndex(change('rename', '/assets/pic.png', '/assets/img.png'))).toBe(false);
});
