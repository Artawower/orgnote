import { test, expect, vi } from 'vitest';
import { resolveValue } from './resolve-value';

test('returns undefined if value is undefined', () => {
  const result = resolveValue();
  expect(result).toBeUndefined();
});

test('returns the value when it is a non-function', () => {
  const value = 'testValue';
  const result = resolveValue(value);
  expect(result).toBe(value);
});

test('calls the function and returns its value when value is a function', () => {
  const mockFunction = vi.fn(() => 'mockReturnValue');
  const result = resolveValue(mockFunction);
  expect(result).toBe('mockReturnValue');
  expect(mockFunction).toHaveBeenCalled();
});

test('handles numbers as value', () => {
  const value = 42;
  const result = resolveValue(value);
  expect(result).toBe(value);
});

test('handles objects as value', () => {
  const value = { key: 'value' };
  const result = resolveValue(value);
  expect(result).toEqual(value);
});

test('handles functions returning complex types', () => {
  const valueFunction = vi.fn(() => ({ key: 'value' }));
  const result = resolveValue(valueFunction);
  expect(result).toEqual({ key: 'value' });
  expect(valueFunction).toHaveBeenCalled();
});


test('preserves falsy plain values', () => {
  expect(resolveValue('')).toBe('');
  expect(resolveValue(0)).toBe(0);
  expect(resolveValue(false)).toBe(false);
});

test('passes arguments to function resolvers', () => {
  const valueFunction = vi.fn((prefix: string, count: number) => `${prefix}-${count}`);

  const result = resolveValue(valueFunction, 'depth', 2);

  expect(result).toBe('depth-2');
  expect(valueFunction).toHaveBeenCalledWith('depth', 2);
});

test('returns objects from argument-aware resolvers', () => {
  const valueFunction = vi.fn((depth: number) => ({ style: `--org-list-depth: ${depth}` }));

  const result = resolveValue(valueFunction, 3);

  expect(result).toEqual({ style: '--org-list-depth: 3' });
  expect(valueFunction).toHaveBeenCalledWith(3);
});