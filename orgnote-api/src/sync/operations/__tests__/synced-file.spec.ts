import { expect, test } from 'vitest';
import { createSyncedFile } from '../synced-file';

test('createSyncedFile preserves contentHash from metadata', () => {
  const result = createSyncedFile(
    { mtime: 1, size: 2, contentHash: 'abc' },
    { status: 'synced' }
  );

  expect(result.contentHash).toBe('abc');
});

test('createSyncedFile keeps contentHash undefined when absent', () => {
  const result = createSyncedFile({ mtime: 1, size: 2 }, { status: 'synced' });

  expect(result.contentHash).toBeUndefined();
});
