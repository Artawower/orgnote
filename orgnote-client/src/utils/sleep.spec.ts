import { test, expect } from 'vitest';
import { sleep } from './sleep';

const TEST_TIMING_TOLERANCE = 80;
const TIMING_LOWER_TOLERANCE = 5;
const IMMEDIATE_TIMING_TOLERANCE = 30;
const IMMEDIATE_TIMING_TOLERANCE_STRICT = 25;

test('sleep delays for the specified time', async () => {
  const start = Date.now();
  const delay = 100;
  await sleep(delay);
  const end = Date.now();

  expect(end - start).toBeGreaterThanOrEqual(delay - TIMING_LOWER_TOLERANCE);
  expect(end - start).toBeLessThan(delay + TEST_TIMING_TOLERANCE);
});

test('sleep resolves correctly', async () => {
  const result = await sleep(50);
  expect(result).toBeUndefined();
});

test('sleep handles zero delay', async () => {
  const start = Date.now();
  await sleep(0);
  const end = Date.now();

  expect(end - start).toBeGreaterThanOrEqual(0);
  expect(end - start).toBeLessThan(IMMEDIATE_TIMING_TOLERANCE);
});

test('sleep handles negative delay', async () => {
  const start = Date.now();
  await sleep(-100);
  const end = Date.now();

  expect(end - start).toBeGreaterThanOrEqual(0);
  expect(end - start).toBeLessThan(IMMEDIATE_TIMING_TOLERANCE_STRICT);
});
