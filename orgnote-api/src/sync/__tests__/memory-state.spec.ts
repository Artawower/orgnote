import { test, expect } from 'vitest';
import { createMemorySyncState } from '../memory-state';

test('initial state empty', async () => {
  const state = createMemorySyncState();
  const data = await state.get();

  expect(data.files).toEqual({});
});

test('initial with values', async () => {
  const state = createMemorySyncState({
    files: { 'a.org': { mtime: 1000, size: 100, status: 'synced' } },
  });
  const data = await state.get();

  expect(data.files['a.org'].mtime).toBe(1000);
});

test('setFile and getFile', async () => {
  const state = createMemorySyncState();

  await state.setFile('b.org', { mtime: 2000, size: 200, status: 'dirty' });
  const file = await state.getFile('b.org');

  expect(file?.mtime).toBe(2000);
  expect(file?.status).toBe('dirty');
});

test('getFile returns null for missing', async () => {
  const state = createMemorySyncState();
  const file = await state.getFile('missing.org');

  expect(file).toBeNull();
});

test('setSyncedAt updates only existing paths', async () => {
  const state = createMemorySyncState({
    files: {
      'a.org': { mtime: 1000, size: 100, status: 'synced' },
      'b.org': { mtime: 2000, size: 200, status: 'pending' },
    },
  });

  await state.setSyncedAt(['a.org', 'missing.org'], '2024-01-02T00:00:00Z');

  expect((await state.getFile('a.org'))?.syncedAt).toBe('2024-01-02T00:00:00Z');
  expect((await state.getFile('b.org'))?.syncedAt).toBeUndefined();
  expect(await state.getFile('missing.org')).toBeNull();
});

test('removeFile', async () => {
  const state = createMemorySyncState();
  await state.setFile('c.org', { mtime: 1000, size: 100, status: 'synced' });

  await state.removeFile('c.org');
  const file = await state.getFile('c.org');

  expect(file).toBeNull();
});

test('clear removes all', async () => {
  const state = createMemorySyncState();
  await state.setFile('d.org', { mtime: 1000, size: 100, status: 'synced' });
  await state.setFile('e.org', { mtime: 2000, size: 200, status: 'synced' });

  await state.clear();
  const data = await state.get();

  expect(data.files).toEqual({});
});

test('get returns copy', async () => {
  const state = createMemorySyncState();
  await state.setFile('f.org', { mtime: 1000, size: 100, status: 'synced' });

  const data1 = await state.get();
  data1.files['g.org'] = { mtime: 2000, size: 200, status: 'synced' };

  const data2 = await state.get();
  expect(data2.files['g.org']).toBeUndefined();
});
