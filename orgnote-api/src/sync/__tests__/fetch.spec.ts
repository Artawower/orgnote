import { expect, test } from 'vitest';
import {
  fetchRemoteChanges,
  InvalidSyncChangesResponseError,
  type InvalidSyncChangesResponseReason,
} from '../fetch';
import { InvalidSyncResponseError } from '../invalid-response-error';
import type { SyncApi } from '../types';

const validChange = {
  id: '1',
  path: '/a.org',
  version: 1,
  deleted: false,
  updatedAt: '2024-01-01T00:00:00Z',
  contentHash: 'hash-1',
};

const createApi = (data: unknown): SyncApi =>
  ({
    syncChangesGet: async () => data,
  }) as unknown as SyncApi;

const createSyncResponse = (data: unknown): unknown => ({ data: { data } });

const expectInvalidSyncResponse = async (
  data: unknown,
  reason: InvalidSyncChangesResponseReason,
): Promise<void> => {
  await expect(fetchRemoteChanges(createApi(createSyncResponse(data)))).rejects.toMatchObject({
    name: 'InvalidSyncChangesResponseError',
    details: {
      operation: 'syncChangesGet',
      reason,
      responseKind: 'json-object',
      topLevelKeys: ['data'],
    },
  });
};

test('InvalidSyncChangesResponseError exposes common sync response contract', () => {
  const error = new InvalidSyncChangesResponseError({
    operation: 'syncChangesGet',
    reason: 'missing_data',
    responseKind: 'json-object',
    topLevelKeys: [],
    dataKeys: [],
  });

  expect(error).toBeInstanceOf(InvalidSyncResponseError);
});

test('fetchRemoteChanges maps contentHash from API changes', async () => {
  const api = createApi(
    createSyncResponse({
      changes: [validChange],
      hasMore: false,
      serverTime: '2024-01-01T00:00:00Z',
    }),
  );

  const result = await fetchRemoteChanges(api);

  expect(result.files).toHaveLength(1);
  expect(result.files[0].contentHash).toBe('hash-1');
});

test('fetchRemoteChanges reports invalid HTML response diagnostics', async () => {
  const api = createApi({
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    data: '<!doctype html><a href="https://example.com/user@example.com">app</a>',
  });

  await expect(fetchRemoteChanges(api)).rejects.toMatchObject({
    name: 'InvalidSyncChangesResponseError',
    details: {
      operation: 'syncChangesGet',
      reason: 'missing_data',
      responseKind: 'html',
      status: 200,
      contentType: 'text/html; charset=utf-8',
      topLevelKeys: [],
      dataKeys: [],
    },
  });
});

test('fetchRemoteChanges rejects response without changes', async () => {
  await expectInvalidSyncResponse(
    {
      hasMore: false,
      serverTime: '2024-01-01T00:00:00Z',
    },
    'missing_changes',
  );
});

test('fetchRemoteChanges rejects paginated response without cursor', async () => {
  await expectInvalidSyncResponse(
    {
      changes: [validChange],
      hasMore: true,
      serverTime: '2024-01-01T00:00:00Z',
    },
    'missing_cursor',
  );
});
