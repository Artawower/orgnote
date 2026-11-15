import { test, expect } from 'vitest';
import { isFilePath } from './is-file-path';

test('returns true for valid file paths', () => {
  expect(isFilePath('folder/file.txt')).toBe(true);
  expect(isFilePath('dir/subdir/image.png')).toBe(true);
  expect(isFilePath('documents/report.pdf')).toBe(true);
  expect(isFilePath('a/b/c/script.js')).toBe(true);
  expect(isFilePath('/untitled-note-1.org')).toBe(true);
});

test('returns false for paths without an extension', () => {
  expect(isFilePath('folder/file')).toBe(false);
  expect(isFilePath('dir/subdir/image')).toBe(false);
  expect(isFilePath('documents/report')).toBe(false);
});

test('returns false for paths without a directory', () => {
  expect(isFilePath('file.txt')).toBe(false);
  expect(isFilePath('image.png')).toBe(false);
  expect(isFilePath('report.pdf')).toBe(false);
});

test('returns false for empty or invalid input', () => {
  expect(isFilePath('')).toBe(false);
  expect(isFilePath('folder/')).toBe(false);
  expect(isFilePath('/folder/file.txt')).toBe(true);
});

test('returns true for paths with multiple dots in filename', () => {
  expect(isFilePath('folder/my.file.txt')).toBe(true);
  expect(isFilePath('dir/subdir/config.test.json')).toBe(true);
});
