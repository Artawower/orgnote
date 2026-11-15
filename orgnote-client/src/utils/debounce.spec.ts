import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('debounce calls function after delay', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100);

  debounced();
  expect(fn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(100);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('debounce multiple rapid calls trigger single execution', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100);

  debounced();
  debounced();
  debounced();
  debounced();
  debounced();

  vi.advanceTimersByTime(100);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('debounce leading option calls immediately on first call', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100, { leading: true });

  debounced();
  expect(fn).toHaveBeenCalledTimes(1);
});

test('debounce leading prevents second immediate call within delay', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100, { leading: true });

  debounced();
  expect(fn).toHaveBeenCalledTimes(1);

  debounced();
  expect(fn).toHaveBeenCalledTimes(1);
});

test('debounce leading resets after delay', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100, { leading: true });

  debounced();
  expect(fn).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(100);

  debounced();
  expect(fn).toHaveBeenCalledTimes(2);
});

test('debounce cancel prevents execution', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100);

  debounced();
  debounced.cancel();

  vi.advanceTimersByTime(100);
  expect(fn).not.toHaveBeenCalled();
});

test('debounce dynamic delay via function', () => {
  const fn = vi.fn();
  const getDelay = vi.fn(() => 200);
  const debounced = debounce(fn, getDelay);

  debounced();
  expect(getDelay).toHaveBeenCalled();

  vi.advanceTimersByTime(100);
  expect(fn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(100);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('debounce zero delay calls function async', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 0);

  debounced();
  expect(fn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(0);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('debounce preserves function arguments', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100);

  debounced('arg1', 42, { key: 'value' });

  vi.advanceTimersByTime(100);
  expect(fn).toHaveBeenCalledWith('arg1', 42, { key: 'value' });
});

test('debounce uses latest arguments on multiple calls', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100);

  debounced('first');
  debounced('second');
  debounced('third');

  vi.advanceTimersByTime(100);
  expect(fn).toHaveBeenCalledWith('third');
});

test('debounce returns void', () => {
  const fn = vi.fn(() => 'return value');
  const debounced = debounce(fn, 100);

  const result = debounced();
  expect(result).toBeUndefined();
});

test('debounce default delay is 100ms', () => {
  const fn = vi.fn();
  const debounced = debounce(fn);

  debounced();

  vi.advanceTimersByTime(99);
  expect(fn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('debounce cancel resets leading state', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100, { leading: true });

  debounced();
  expect(fn).toHaveBeenCalledTimes(1);

  debounced.cancel();

  debounced();
  expect(fn).toHaveBeenCalledTimes(2);
});

test('debounce trailing call after leading', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 100, { leading: true });

  debounced('first');
  expect(fn).toHaveBeenCalledWith('first');

  debounced('second');

  vi.advanceTimersByTime(100);
  expect(fn).toHaveBeenCalledTimes(2);
  expect(fn).toHaveBeenLastCalledWith('second');
});
