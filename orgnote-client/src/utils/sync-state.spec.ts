import { test, expect, beforeEach } from 'vitest';
import { ref, type Ref } from 'vue';
import type { SyncStateData, SyncedFile } from 'orgnote-api';
import { createSyncState } from './sync-state';

const createMockFile = (overrides?: Partial<SyncedFile>): SyncedFile => ({
  mtime: 1000,
  size: 100,
  status: 'synced',
  ...overrides,
});

let stateData: Ref<SyncStateData | null>;

beforeEach(() => {
  stateData = ref<SyncStateData | null>(null);
});

test('get returns empty files when stateData is null', async () => {
  const state = createSyncState(stateData);
  const result = await state.get();
  expect(result).toEqual({ files: {} });
});

test('get returns current stateData when present', async () => {
  const file = createMockFile();
  stateData.value = { files: { '/test.org': file } };

  const state = createSyncState(stateData);
  const result = await state.get();

  expect(result.files['/test.org']).toEqual(file);
});

test('getFile returns null when stateData is null', async () => {
  const state = createSyncState(stateData);
  const result = await state.getFile('/test.org');
  expect(result).toBeNull();
});

test('getFile returns null when file does not exist', async () => {
  stateData.value = { files: {} };

  const state = createSyncState(stateData);
  const result = await state.getFile('/test.org');

  expect(result).toBeNull();
});

test('getFile returns file when exists', async () => {
  const file = createMockFile();
  stateData.value = { files: { '/test.org': file } };

  const state = createSyncState(stateData);
  const result = await state.getFile('/test.org');

  expect(result).toEqual(file);
});

test('setFile adds new file to empty state', async () => {
  const state = createSyncState(stateData);
  const file = createMockFile();

  await state.setFile('/test.org', file);

  expect(stateData.value?.files['/test.org']).toEqual(file);
});

test('setFile updates existing file', async () => {
  const oldFile = createMockFile({ mtime: 1000 });
  stateData.value = { files: { '/test.org': oldFile } };

  const state = createSyncState(stateData);
  const newFile = createMockFile({ mtime: 2000 });

  await state.setFile('/test.org', newFile);

  expect(stateData.value?.files['/test.org']?.mtime).toBe(2000);
});

test('setFile preserves other files', async () => {
  const file1 = createMockFile();
  const file2 = createMockFile();
  stateData.value = { files: { '/file1.org': file1 } };

  const state = createSyncState(stateData);
  await state.setFile('/file2.org', file2);

  expect(stateData.value?.files['/file1.org']).toEqual(file1);
  expect(stateData.value?.files['/file2.org']).toEqual(file2);
});

test('setSyncedAt updates selected files atomically', async () => {
  const selected = createMockFile();
  const untouched = createMockFile();
  stateData.value = {
    files: { '/selected.org': selected, '/untouched.org': untouched },
  };

  const state = createSyncState(stateData);
  await state.setSyncedAt(
    ['/selected.org', '/missing.org'],
    '2024-01-02T00:00:00Z'
  );

  expect(stateData.value?.files['/selected.org']?.syncedAt).toBe(
    '2024-01-02T00:00:00Z'
  );
  expect(stateData.value?.files['/untouched.org']?.syncedAt).toBeUndefined();
  expect(stateData.value?.files['/missing.org']).toBeUndefined();
});

test('removeFile does nothing when stateData is null', async () => {
  const state = createSyncState(stateData);
  await state.removeFile('/test.org');
  expect(stateData.value).toBeNull();
});

test('removeFile removes existing file', async () => {
  const file = createMockFile();
  stateData.value = { files: { '/test.org': file } };

  const state = createSyncState(stateData);
  await state.removeFile('/test.org');

  expect(stateData.value?.files['/test.org']).toBeUndefined();
});

test('removeFile preserves other files', async () => {
  const file1 = createMockFile();
  const file2 = createMockFile();
  stateData.value = { files: { '/file1.org': file1, '/file2.org': file2 } };

  const state = createSyncState(stateData);
  await state.removeFile('/file1.org');

  expect(stateData.value?.files['/file1.org']).toBeUndefined();
  expect(stateData.value?.files['/file2.org']).toEqual(file2);
});

test('clear resets state to empty files', async () => {
  const file = createMockFile();
  stateData.value = { files: { '/test.org': file } };

  const state = createSyncState(stateData);
  await state.clear();

  expect(stateData.value).toEqual({ files: {} });
});
