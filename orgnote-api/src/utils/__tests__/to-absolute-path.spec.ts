import { test, expect } from 'vitest';
import { toAbsolutePath, toRelativePath } from '../to-absolute-path';

test('toAbsolutePath adds leading slash to relative path', () => {
  expect(toAbsolutePath('folder/file.org')).toBe('/folder/file.org');
});

test('toAbsolutePath keeps absolute path unchanged', () => {
  expect(toAbsolutePath('/folder/file.org')).toBe('/folder/file.org');
});

test('toAbsolutePath handles empty string', () => {
  expect(toAbsolutePath('')).toBe('/');
});

test('toAbsolutePath handles root path', () => {
  expect(toAbsolutePath('/')).toBe('/');
});

test('toRelativePath removes leading slash from absolute path', () => {
  expect(toRelativePath('/folder/file.org')).toBe('folder/file.org');
});

test('toRelativePath keeps relative path unchanged', () => {
  expect(toRelativePath('folder/file.org')).toBe('folder/file.org');
});

test('toRelativePath handles root path', () => {
  expect(toRelativePath('/')).toBe('');
});

test('toRelativePath handles empty string', () => {
  expect(toRelativePath('')).toBe('');
});
