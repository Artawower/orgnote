import { test, expect } from 'vitest';
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
} from './sidebar';

test('SIDEBAR_MIN_WIDTH has correct value', () => {
  expect(SIDEBAR_MIN_WIDTH).toBe(200);
});

test('SIDEBAR_MAX_WIDTH has correct value', () => {
  expect(SIDEBAR_MAX_WIDTH).toBe(600);
});

test('SIDEBAR_DEFAULT_WIDTH has correct value', () => {
  expect(SIDEBAR_DEFAULT_WIDTH).toBe(300);
});

test('SIDEBAR_MIN_WIDTH is less than SIDEBAR_MAX_WIDTH', () => {
  expect(SIDEBAR_MIN_WIDTH).toBeLessThan(SIDEBAR_MAX_WIDTH);
});

test('SIDEBAR_DEFAULT_WIDTH is within min and max bounds', () => {
  expect(SIDEBAR_DEFAULT_WIDTH).toBeGreaterThanOrEqual(SIDEBAR_MIN_WIDTH);
  expect(SIDEBAR_DEFAULT_WIDTH).toBeLessThanOrEqual(SIDEBAR_MAX_WIDTH);
});
