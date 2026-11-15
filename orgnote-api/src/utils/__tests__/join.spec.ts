import { test, expect } from 'vitest';
import { join } from '../join-path';

test('joins relative paths', () => {
  expect(join('dir1', 'subdir2', 'file')).toBe('dir1/subdir2/file');
});

test('joins paths with trailing slashes', () => {
  expect(join('dir2/', '/file')).toBe('dir2/file');
});

test('joins absolute path with subdirs', () => {
  expect(join('/dir3', 'subdir2/', 'file')).toBe('/dir3/subdir2/file');
});

test('returns single path as is', () => {
  expect(join('file')).toBe('file');
});

test('preserves absolute path when first arg starts with /', () => {
  expect(join('/', 'this', 'is-path')).toBe('/this/is-path');
});

test('filters standalone slashes in the middle', () => {
  expect(join('path', '/', 'to', '/', 'file')).toBe('path/to/file');
});

test('handles empty string without adding slash', () => {
  expect(join('', 'file')).toBe('file');
});

test('returns / for root only', () => {
  expect(join('/')).toBe('/');
});

test('returns / for root with empty segments', () => {
  expect(join('/', '')).toBe('/');
});

test('returns empty for empty input', () => {
  expect(join('')).toBe('');
});
