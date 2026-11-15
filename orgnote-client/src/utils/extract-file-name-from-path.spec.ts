import { expect, test } from 'vitest';
import { extractFileNameFromPath } from './extract-file-name-from-path';

test('extracts file name from a simple path', () => {
  const path = 'folder/file.txt';
  const result = extractFileNameFromPath(path);
  expect(result).toBe('file.txt');
});

test('extracts file name from a nested path', () => {
  const path = 'folder/subfolder/file.txt';
  const result = extractFileNameFromPath(path);
  expect(result).toBe('file.txt');
});

test('extracts file name from a path with trailing slash', () => {
  const path = 'folder/subfolder/';
  const result = extractFileNameFromPath(path);
  expect(result).toBe('');
});

test('extracts file name from a path with no slashes', () => {
  const path = 'file.txt';
  const result = extractFileNameFromPath(path);
  expect(result).toBe('file.txt');
});

test('extracts file name from an empty path', () => {
  const path = '';
  const result = extractFileNameFromPath(path);
  expect(result).toBe('');
});

test('handles undefined path', () => {
  const path = undefined as unknown as string;
  const result = extractFileNameFromPath(path);
  expect(result).toBe('');
});

test('handles null path', () => {
  const path = null as unknown as string;
  const result = extractFileNameFromPath(path);
  expect(result).toBe('');
});

test('handles path with only slashes', () => {
  const path = '///';
  const result = extractFileNameFromPath(path);
  expect(result).toBe('');
});
