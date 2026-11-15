import type { FileSystemChange } from 'orgnote-api';
import { expect, test } from 'vitest';
import { createLocalChangeFilter } from './local-change-filter';

const createClock = () => {
  let current = 0;
  return { now: () => current, advance: (ms: number) => (current += ms) };
};

const modify = (mtime?: number): FileSystemChange => ({ path: '/inbox.org', type: 'modify', mtime });

test('createLocalChangeFilter drops the native echo of a local write with the same mtime long after it', () => {
  const clock = createClock();
  const filter = createLocalChangeFilter(clock.now);
  filter.remember(modify(100));

  clock.advance(2000);

  expect(filter.isDuplicate(modify(100))).toBe(true);
});

test('createLocalChangeFilter keeps a native change with a newer mtime', () => {
  const clock = createClock();
  const filter = createLocalChangeFilter(clock.now);
  filter.remember(modify(100));

  expect(filter.isDuplicate(modify(200))).toBe(false);
});

test('createLocalChangeFilter only drops changes without mtime within the short window', () => {
  const clock = createClock();
  const filter = createLocalChangeFilter(clock.now);
  filter.remember(modify());

  const isEarlyDuplicate = filter.isDuplicate(modify());
  clock.advance(600);

  expect(isEarlyDuplicate).toBe(true);
  expect(filter.isDuplicate(modify())).toBe(false);
});

test('createLocalChangeFilter matches a native echo whose mtime lost the fractional milliseconds', () => {
  const filter = createLocalChangeFilter(createClock().now);
  filter.remember(modify(1_700_000_000_123.75));

  expect(filter.isDuplicate(modify(1_700_000_000_123))).toBe(true);
});
