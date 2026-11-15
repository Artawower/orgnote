import { describe, expect, test } from 'vitest';
import type { FileSystem } from 'orgnote-api';
import { createFileSystemSessionState } from './file-system-session';

const createMockFs = (): FileSystem => ({
  readFile: (async () => '' as never) as FileSystem['readFile'],
  writeFile: async () => undefined,
  readDir: async () => [],
  fileInfo: async () => undefined,
  rename: async () => undefined,
  deleteFile: async () => undefined,
  rmdir: async () => undefined,
  mkdir: async () => undefined,
  isDirExist: async () => true,
  isFileExist: async () => true,
  utimeSync: async () => undefined,
});

describe('createFileSystemSessionState', () => {
  test('publishes new session with sequence 1 and matching storageKey', () => {
    const sessionState = createFileSystemSessionState();
    const fs = createMockFs();

    const session = sessionState.publishIfChanged(fs, 'my-fs', '/my-root');

    expect(session).toEqual({
      id: 1,
      fs,
      fsName: 'my-fs',
      root: '/my-root',
      storageKey: 'my-fs:/my-root',
    });
    expect(sessionState.currentSession.value).toBe(session);
  });

  test('does not re-publish if fs, fsName, and root are identical', () => {
    const sessionState = createFileSystemSessionState();
    const fs = createMockFs();

    const first = sessionState.publishIfChanged(fs, 'my-fs', '/root');
    const second = sessionState.publishIfChanged(fs, 'my-fs', '/root');

    expect(second).toBe(first);
    expect(second.id).toBe(1);
  });

  test('increments sequence when root changes', () => {
    const sessionState = createFileSystemSessionState();
    const fs = createMockFs();

    const first = sessionState.publishIfChanged(fs, 'my-fs', '/root-1');
    const second = sessionState.publishIfChanged(fs, 'my-fs', '/root-2');

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect(second.root).toBe('/root-2');
  });

  test('increments sequence when filesystem instance changes', () => {
    const sessionState = createFileSystemSessionState();
    const fs1 = createMockFs();
    const fs2 = createMockFs();

    const first = sessionState.publishIfChanged(fs1, 'my-fs');
    const second = sessionState.publishIfChanged(fs2, 'my-fs');

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
  });

  test('clear resets currentSession to null', () => {
    const sessionState = createFileSystemSessionState();
    const fs = createMockFs();

    sessionState.publishIfChanged(fs, 'my-fs');
    expect(sessionState.currentSession.value).not.toBeNull();

    sessionState.clear();
    expect(sessionState.currentSession.value).toBeNull();
  });

  test('isActive validates matching active session id', () => {
    const sessionState = createFileSystemSessionState();
    const fs = createMockFs();

    const first = sessionState.publishIfChanged(fs, 'my-fs');
    expect(sessionState.isActive(first)).toBe(true);

    const second = sessionState.publishIfChanged(fs, 'my-fs', '/new-root');
    expect(sessionState.isActive(first)).toBe(false);
    expect(sessionState.isActive(second)).toBe(true);

    sessionState.clear();
    expect(sessionState.isActive(second)).toBe(false);
  });
});
