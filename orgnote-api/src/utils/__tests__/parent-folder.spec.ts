import { test, expect } from 'vitest';
import { getParentDir } from '../get-parent-dir';

test('Should return correct parent dirs', () => {
  expect(getParentDir('some/path/to/file')).toBe('some/path/to');
  expect(getParentDir('another/path/to/dir/')).toBe('another/path/to');
  expect(getParentDir(['root', 'folder', 'subfolder'])).toBe('root/folder');
  expect(getParentDir('single')).toBe('');

  expect(getParentDir('/file')).toBe('');
  expect(getParentDir(['/'])).toBe('');
  expect(getParentDir('file')).toBe('');
});

test('Should not return parent dir when file at the root', () => {
  expect(getParentDir('')).toBe('');
});
