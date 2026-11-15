import { test, expect } from 'vitest';
import { getOldestSyncedAt } from '../oldest-synced-at';
import type { SyncStateData, SyncedFile } from '../../types';

const createFile = (syncedAt?: string): SyncedFile => ({
  mtime: 1000,
  size: 100,
  status: 'synced',
  syncedAt,
});

test('returns undefined when no files', () => {
  const state: SyncStateData = { files: {} };
  expect(getOldestSyncedAt(state)).toBeUndefined();
});

test('returns undefined when no files have syncedAt', () => {
  const state: SyncStateData = {
    files: { '/a.org': createFile() },
  };
  expect(getOldestSyncedAt(state)).toBeUndefined();
});

test('returns oldest syncedAt from files', () => {
  const state: SyncStateData = {
    files: {
      '/a.org': createFile('2024-01-03T00:00:00Z'),
      '/b.org': createFile('2024-01-01T00:00:00Z'),
      '/c.org': createFile('2024-01-02T00:00:00Z'),
    },
  };
  expect(getOldestSyncedAt(state)).toBe('2024-01-01T00:00:00Z');
});

test('returns undefined when a tracked file has no syncedAt', () => {
  const state: SyncStateData = {
    files: {
      '/a.org': createFile('2024-01-02T00:00:00Z'),
      '/b.org': createFile(),
      '/c.org': createFile('2024-01-03T00:00:00Z'),
    },
  };
  expect(getOldestSyncedAt(state)).toBeUndefined();
});

test('ignores excluded state paths', () => {
  const state: SyncStateData = {
    files: {
      '/a.org': createFile('2024-01-02T00:00:00Z'),
      '/ignored.org': createFile(),
    },
  };

  expect(getOldestSyncedAt(state, (path) => path === '/ignored.org')).toBe(
    '2024-01-02T00:00:00Z'
  );
});
