import { getStringPath } from '../get-string-path';
import { test, expect } from 'vitest';

test('should return the same string if path is a string', () => {
  const path = 'some/path';
  const result = getStringPath(path);
  expect(result).toBe('some/path');
});

test('should join array elements with "/" if path is an array', () => {
  const path = ['some', 'path'];
  const result = getStringPath(path);
  expect(result).toBe('some/path');
});

test('should return an empty string if path is an empty array', () => {
  const path: string[] = [];
  const result = getStringPath(path);
  expect(result).toBe('');
});

test('should handle array with one element correctly', () => {
  const path = ['single'];
  const result = getStringPath(path);
  expect(result).toBe('single');
});

test('should handle array with multiple elements correctly', () => {
  const path = ['this', 'is', 'a', 'test'];
  const result = getStringPath(path);
  expect(result).toBe('this/is/a/test');
});
