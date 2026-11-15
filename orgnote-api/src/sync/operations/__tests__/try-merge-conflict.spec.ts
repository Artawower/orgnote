import { expect, test, vi } from 'vitest';
import type { FileSystem } from '../../../models/file-system';
import type { SyncExecutor } from '../../types';
import { tryMergeConflict } from '../conflict';
import { createMemorySyncState } from '../../memory-state';

const createMergeContext = (overrides: {
  fs: Record<string, unknown>;
  executor?: Record<string, unknown>;
  isDirtyFile?: (path: string) => Promise<boolean> | boolean;
}) => ({
  fs: overrides.fs as unknown as FileSystem,
  executor: (overrides.executor ?? {}) as unknown as SyncExecutor,
  state: createMemorySyncState(),
  serverTime: '2024-01-01T00:00:00Z',
  deviceName: 'test-device',
  isDirtyFile: overrides.isDirtyFile,
});

const CONFLICT_RESULT = {
  status: 'conflict' as const,
  serverVersion: 5,
};

const BASE_CONTENT = new TextEncoder().encode('* TODO Base task\n');
const LOCAL_CONTENT = new TextEncoder().encode('* DONE Local edit\n');
const REMOTE_CONTENT = new TextEncoder().encode('* TODO Base task\n* New remote\n');

test('returns false for non-mergeable file extension', async () => {
  const ctx = createMergeContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 1, size: 100 })),
    },
  });

  const result = await tryMergeConflict(
    '/image.png',
    CONFLICT_RESULT,
    BASE_CONTENT,
    ctx
  );

  expect(result).toBeNull();
});

test('returns false when no base content provided', async () => {
  const ctx = createMergeContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 1, size: 100 })),
    },
  });

  const result = await tryMergeConflict(
    '/note.org',
    CONFLICT_RESULT,
    null,
    ctx
  );

  expect(result).toBeNull();
});

test('returns false when file is dirty in editor', async () => {
  const ctx = createMergeContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 1, size: 200 })),
    },
    isDirtyFile: async () => true,
  });

  const result = await tryMergeConflict(
    '/note.org',
    CONFLICT_RESULT,
    BASE_CONTENT,
    ctx
  );

  expect(result).toBeNull();
});

test('returns false when remote download fails with 404', async () => {
  const { AxiosError } = await import('axios');
  const notFoundResponse = {
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config: {} as never,
    data: {},
  };
  const ctx = createMergeContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 1, size: 200 })),
      readFile: vi.fn(async () => LOCAL_CONTENT),
      writeFile: vi.fn(async () => undefined),
      deleteFile: vi.fn(async () => undefined),
    },
    executor: {
      download: vi.fn(async () => {
        throw new AxiosError(
          'Not Found',
          'ERR_BAD_REQUEST',
          undefined,
          undefined,
          notFoundResponse
        );
      }),
    },
  });

  const result = await tryMergeConflict(
    '/note.org',
    CONFLICT_RESULT,
    BASE_CONTENT,
    ctx
  );

  expect(result).toBeNull();
});

test('returns false when no base available for merge', async () => {
  const ctx = createMergeContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 1, size: 200 })),
    },
  });

  const result = await tryMergeConflict(
    '/note.org',
    CONFLICT_RESULT,
    null,
    ctx
  );

  expect(result).toBeNull();
});

test('writes merged content when merge succeeds', async () => {
  const ctx = createMergeContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 1, size: 200 })),
      readFile: vi.fn()
        .mockResolvedValueOnce(LOCAL_CONTENT)
        .mockResolvedValueOnce(REMOTE_CONTENT),
      writeFile: vi.fn(async () => undefined),
      deleteFile: vi.fn(async () => undefined),
    },
    executor: {
      download: vi.fn(async () => undefined),
    },
  });

  const result = await tryMergeConflict(
    '/note.org',
    CONFLICT_RESULT,
    BASE_CONTENT,
    ctx
  );

  expect(result).toBeTruthy();
  expect(ctx.fs.writeFile).toHaveBeenCalledWith('/note.org', expect.any(Uint8Array));
});

test('reads local content before downloading remote', async () => {
  const callOrder: string[] = [];
  const ctx = createMergeContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 1, size: 200 })),
      readFile: vi.fn(async () => {
        callOrder.push('readLocal');
        return LOCAL_CONTENT;
      }),
      writeFile: vi.fn(async () => undefined),
      deleteFile: vi.fn(async () => {
        callOrder.push('deleteTemp');
      }),
    },
    executor: {
      download: vi.fn(async () => {
        callOrder.push('download');
      }),
    },
  });

  await tryMergeConflict('/note.org', CONFLICT_RESULT, BASE_CONTENT, ctx);

  expect(callOrder.indexOf('readLocal')).toBeLessThan(callOrder.indexOf('download'));
});

test('restores local content when merge is ambiguous', async () => {
  const local = new TextEncoder().encode('* Local\n');
  const remote = new TextEncoder().encode('* Remote\n');
  const writeFile = vi.fn(async () => undefined);
  const ctx = createMergeContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 1, size: 200 })),
      readFile: vi.fn().mockResolvedValueOnce(local).mockResolvedValueOnce(remote),
      writeFile,
    },
    executor: {
      download: vi.fn(async () => undefined),
    },
  });

  const result = await tryMergeConflict(
    '/note.org',
    CONFLICT_RESULT,
    BASE_CONTENT,
    ctx
  );

  expect(result).toBeNull();
  expect(writeFile).toHaveBeenCalledWith('/note.org', local);
});

test('merges non-overlapping OrgNote config changes', async () => {
  const base = new TextEncoder().encode('[network]\napiUrl = "old"\n');
  const local = new TextEncoder().encode('[network]\napiUrl = "correct"\n');
  const remote = new TextEncoder().encode(
    '[network]\napiUrl = "old"\n\n[synchronization]\ntype = "api"\n'
  );
  const writeFile = vi.fn(async () => undefined);
  const ctx = createMergeContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 1, size: 200 })),
      readFile: vi.fn().mockResolvedValueOnce(local).mockResolvedValueOnce(remote),
      writeFile,
    },
    executor: {
      download: vi.fn(async () => undefined),
    },
  });

  const result = await tryMergeConflict(
    '/.orgnote/config.toml',
    CONFLICT_RESULT,
    base,
    ctx
  );

  expect(result).toBeTruthy();
  expect(new TextDecoder().decode(result ?? new Uint8Array())).toContain('apiUrl = "correct"');
  expect(new TextDecoder().decode(result ?? new Uint8Array())).toContain('type = "api"');
});
