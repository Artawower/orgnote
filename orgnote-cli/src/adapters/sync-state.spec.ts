import { beforeEach, expect, test, vi } from 'vitest';
import type { SyncStateData } from 'orgnote-api';
import { createSyncState } from './sync-state.js';

let storedFiles: SyncStateData['files'];

vi.mock('../store/store.js', () => ({
  initStore: () => ({
    get: (key: string) => (key === 'files' ? storedFiles : undefined),
    set: (key: string, value: SyncStateData['files']) => {
      if (key === 'files') storedFiles = value;
    },
  }),
}));

beforeEach(() => {
  storedFiles = {
    '/selected.org': { mtime: 1, size: 1, status: 'synced' },
    '/untouched.org': { mtime: 2, size: 2, status: 'synced' },
  };
});

test('setSyncedAt updates selected files in one state write', async () => {
  const state = createSyncState('test');

  await state.setSyncedAt(
    ['/selected.org', '/missing.org'],
    '2024-01-02T00:00:00Z'
  );

  expect(storedFiles['/selected.org']?.syncedAt).toBe(
    '2024-01-02T00:00:00Z'
  );
  expect(storedFiles['/untouched.org']?.syncedAt).toBeUndefined();
  expect(storedFiles['/missing.org']).toBeUndefined();
});
