import { test, expect } from 'vitest';
import { removeRelativePath } from './remove-relative-path';

test('removeRelativePath: removes relative "./" from the beginning of the path', () => {
  expect(removeRelativePath('./some/path')).toBe('some/path');
});

test('removeRelativePath: does nothing if the path does not start with "./"', () => {
  expect(removeRelativePath('some/path')).toBe('some/path');
});

test('removeRelativePath: handles empty strings', () => {
  expect(removeRelativePath('')).toBe('');
});

test('removeRelativePath: does nothing if the path is already an absolute path', () => {
  expect(removeRelativePath('/absolute/path')).toBe('/absolute/path');
});

test('removeRelativePath: removes "./" only from the beginning', () => {
  expect(removeRelativePath('some/./path')).toBe('some/./path');
});
