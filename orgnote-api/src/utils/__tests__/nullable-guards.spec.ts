import { test, expect } from 'vitest';
import { isNullable, isPresent } from '../nullable-guards';

test('isNullable returns true for null', () => {
  expect(isNullable(null)).toBe(true);
});

test('isNullable returns true for undefined', () => {
  expect(isNullable(undefined)).toBe(true);
});

test('isNullable returns false for valid values', () => {
  expect(isNullable(0)).toBe(false);
  expect(isNullable('')).toBe(false);
  expect(isNullable(false)).toBe(false);
  expect(isNullable([])).toBe(false);
});

test('isNullable returns true for NaN', () => {
  expect(isNullable(NaN)).toBe(true);
});

test('isPresent returns false for null', () => {
  expect(isPresent(null)).toBe(false);
});

test('isPresent returns false for undefined', () => {
  expect(isPresent(undefined)).toBe(false);
});

test('isPresent returns true for valid values', () => {
  expect(isPresent(0)).toBe(true);
  expect(isPresent('')).toBe(true);
  expect(isPresent(false)).toBe(true);
  expect(isPresent([])).toBe(true);
});

test('isPresent returns false for NaN', () => {
  expect(isPresent(NaN)).toBe(false);
});



test('type guards work with TypeScript narrowing', () => {
  const value: string | null | undefined = 'test';
  
  if (isPresent(value)) {
    const upper: string = value.toUpperCase();
    expect(upper).toBe('TEST');
  }
});

test('isPresent filters array correctly', () => {
  const arr = [1, null, 2, undefined, 3];
  const filtered = arr.filter(isPresent);
  expect(filtered).toEqual([1, 2, 3]);
});
