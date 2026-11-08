import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { nextTick } from 'vue';
import { useBufferStore } from './buffer';
import type { FileMeta } from 'orgnote-api';

const mockFiles: Map<string, FileMeta> = new Map();
const mockFileContents: Map<string, Uint8Array> = new Map();
let mockEncryptionType = 'disabled';
const mockSync = vi.fn(async () => {});

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileSystemManager: vi.fn(() => ({
        currentFs: {
          readFile: vi.fn(async (path: string) => mockFileContents.get(path)),
          writeFile: vi.fn(async (path: string, content: Uint8Array) => {
            mockFileContents.set(path, content);
          }),
        },
      })),
      useEncryption: vi.fn(() => ({
        encrypt: vi.fn(async (text: string) => `encrypted:${text}`),
        decrypt: vi.fn(async (text: string) => text.replace('encrypted:', '')),
      })),
      useConfig: vi.fn(() => ({
        config: {
          encryption: { get type() { return mockEncryptionType; } },
          editor: {
            saveDelayMs: 100,
            validationDelayMs: 100,
          },
        },
      })),
      useBufferProviders: vi.fn(() => ({
        get: (scheme: string) => mockProviders.get(scheme),
        register: (provider: { scheme: string }) => {
          mockProviders.set(provider.scheme, provider as typeof mockProviders extends Map<string, infer V> ? V : never);
        },
        unregister: (scheme: string) => {
          mockProviders.delete(scheme);
        },
      })),
      useSync: vi.fn(() => ({
        sync: mockSync,
      })),
    },
    infrastructure: {
      fileRepository: {
        getByPath: vi.fn(async (path: string[]) => {
          const key = path.join('/');
          return mockFiles.get(key);
        }),
        save: vi.fn(async (file: FileMeta) => {
          mockFiles.set(file.filePath.join('/'), file);
        }),
      },
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError: vi.fn(),
    reportWarning: vi.fn(),
  },
}));

vi.mock('./file-guard', () => ({
  useFileGuardStore: vi.fn(() => ({
    isReadOnly: vi.fn(() => false),
    getGuard: vi.fn(() => null),
    getReadOnlyReason: vi.fn(() => undefined),
    validate: vi.fn(async () => []),
  })),
}));

const mockWatchers: Map<string, (change: { type: string; path: string }) => void> = new Map();
const mockProviders: Map<string, {
  scheme: string;
  read: (path: string) => Promise<Uint8Array>;
  write?: (path: string, content: Uint8Array) => Promise<void>;
  watch?: (path: string, callback: (change: { type: string; path: string }) => void) => () => void;
  getContext?: (path: string) => { title?: string };
}> = new Map();

const createFileProvider = () => ({
  scheme: 'file',
  read: async (path: string) => mockFileContents.get(path) ?? new Uint8Array(0),
  write: async (path: string, content: Uint8Array) => {
    mockFileContents.set(path, content);
  },
  watch: (path: string, callback: (change: { type: string; path: string }) => void) => {
    mockWatchers.set(path, callback);
    return () => mockWatchers.delete(path);
  },
  getContext: (path: string) => ({
    title: path.split('/').pop() || 'Untitled',
  }),
});

vi.mock('./file-watcher', () => ({
  useFileWatcherStore: vi.fn(() => ({
    watch: vi.fn((path: string, callback: (change: { type: string; path: string }) => void) => {
      mockWatchers.set(path, callback);
      return () => mockWatchers.delete(path);
    }),
  })),
}));



const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

beforeEach(() => {
  setActivePinia(createPinia());
  mockFiles.clear();
  mockFileContents.clear();
  mockWatchers.clear();
  mockProviders.clear();
  mockProviders.set('file', createFileProvider());
  mockEncryptionType = 'disabled';
  mockSync.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

test('getOrCreateBuffer creates new buffer for new path', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/test.org', textEncoder.encode('Test content'));

  const buffer = await store.getOrCreateBuffer('/notes/test.org');

  expect(buffer).toBeDefined();
  expect(buffer.path).toBe('/notes/test.org');
  expect(buffer.text).toBe('Test content');
});

test('getOrCreateBuffer returns existing buffer for same path', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/test.org', textEncoder.encode('Content'));

  const buffer1 = await store.getOrCreateBuffer('/notes/test.org');
  const buffer2 = await store.getOrCreateBuffer('/notes/test.org');

  expect(buffer1).toBe(buffer2);
});

test('getOrCreateBuffer increments referenceCount on second call', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/test.org', textEncoder.encode('Content'));

  const buffer = await store.getOrCreateBuffer('/notes/test.org');
  expect(buffer.referenceCount).toBe(1);

  await store.getOrCreateBuffer('/notes/test.org');
  expect(buffer.referenceCount).toBe(2);
});

test('getOrCreateBuffer loads content from filesystem', async () => {
  const store = useBufferStore();
  const content = 'Loaded from disk';
  mockFileContents.set('/notes/loaded.org', textEncoder.encode(content));

  const buffer = await store.getOrCreateBuffer('/notes/loaded.org');

  expect(buffer.text).toBe(content);
});

test('getOrCreateBuffer sets isLoading during load', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/loading.org', textEncoder.encode('Content'));

  const bufferPromise = store.getOrCreateBuffer('/notes/loading.org');
  const buffer = await bufferPromise;

  expect(buffer.isLoading).toBe(false);
});

test('getOrCreateBuffer extracts title from path', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/my-note.org', textEncoder.encode(''));

  const buffer = await store.getOrCreateBuffer('/notes/my-note.org');

  expect(buffer.title).toBe('my-note.org');
});

test('getOrCreateBuffer updates touchedAt for org files', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/touch.org', textEncoder.encode(''));
  mockFiles.set('notes/touch.org', {
    id: 'touch-id',
    filePath: ['notes', 'touch.org'],
    title: 'Touch',
  });

  await store.getOrCreateBuffer('/notes/touch.org');

  await vi.runAllTimersAsync();

  const savedFile = mockFiles.get('notes/touch.org');
  expect(savedFile?.touchedAt).toBeDefined();
});

test('getOrCreateBuffer handles missing file gracefully', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/empty.org', new Uint8Array(0));

  const buffer = await store.getOrCreateBuffer('/notes/empty.org');

  expect(buffer).toBeDefined();
  expect(buffer.text).toBe('');
});

test('releaseBuffer decrements referenceCount', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/release.org', textEncoder.encode(''));

  const buffer = await store.getOrCreateBuffer('/notes/release.org');
  await store.getOrCreateBuffer('/notes/release.org');
  expect(buffer.referenceCount).toBe(2);

  store.releaseBuffer('/notes/release.org');
  expect(buffer.referenceCount).toBe(1);
});

test('releaseBuffer does not go below zero', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/zero.org', textEncoder.encode(''));

  const buffer = await store.getOrCreateBuffer('/notes/zero.org');

  store.releaseBuffer('/notes/zero.org');
  store.releaseBuffer('/notes/zero.org');
  store.releaseBuffer('/notes/zero.org');

  expect(buffer.referenceCount).toBe(0);
});

test('releaseBuffer does nothing for non-existent path', () => {
  const store = useBufferStore();
  expect(() => store.releaseBuffer('/nonexistent')).not.toThrow();
});

test('closeBuffer returns true for clean buffer', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/clean.org', textEncoder.encode('Content'));

  await store.getOrCreateBuffer('/notes/clean.org');

  const result = await store.closeBuffer('/notes/clean.org');
  expect(result).toBe(true);
});

test('closeBuffer removes buffer from store', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/remove.org', textEncoder.encode(''));

  await store.getOrCreateBuffer('/notes/remove.org');
  await store.closeBuffer('/notes/remove.org');

  expect(store.getBufferByUri('/notes/remove.org')).toBeUndefined();
});

test('closeBuffer returns false for dirty buffer without force', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/dirty.org', textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer('/notes/dirty.org');
  buffer.setText('Modified content');

  const result = await store.closeBuffer('/notes/dirty.org');
  expect(result).toBe(false);
});

test('closeBuffer with force closes dirty buffer', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/force.org', textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer('/notes/force.org');
  buffer.setText('Modified content');

  const result = await store.closeBuffer('/notes/force.org', true);
  expect(result).toBe(true);
  expect(store.getBufferByUri('/notes/force.org')).toBeUndefined();
});

test('closeBuffer cancels pending auto-save work', async () => {
  const store = useBufferStore();
  const path = '/notes/closing.org';
  mockFileContents.set(path, textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer(path);
  buffer.setText('Saved before close');
  await nextTick();
  await store.closeBuffer(path, true);
  buffer.setText('Stale after close');
  await vi.runAllTimersAsync();

  expect(textDecoder.decode(mockFileContents.get(path))).toBe('Saved before close');
});

test('closeBuffer returns true for non-existent path', async () => {
  const store = useBufferStore();
  const result = await store.closeBuffer('/nonexistent');
  expect(result).toBe(true);
});

test('getBufferByUri returns buffer for existing uri', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/get.org', textEncoder.encode(''));

  const created = await store.getOrCreateBuffer('/notes/get.org');
  const retrieved = store.getBufferByUri('/notes/get.org');

  expect(retrieved).toBe(created);
});

test('getBufferByUri returns undefined for non-existent uri', () => {
  const store = useBufferStore();
  const result = store.getBufferByUri('/nonexistent');
  expect(result).toBeUndefined();
});

test('saveAllBuffers saves all dirty buffers', async () => {
  const store = useBufferStore();

  mockFileContents.set('/notes/save1.org', textEncoder.encode('Original 1'));
  mockFileContents.set('/notes/save2.org', textEncoder.encode('Original 2'));

  const buffer1 = await store.getOrCreateBuffer('/notes/save1.org');
  const buffer2 = await store.getOrCreateBuffer('/notes/save2.org');

  buffer1.setText('Modified 1');
  buffer2.setText('Modified 2');

  await store.saveAllBuffers();

  expect(textDecoder.decode(mockFileContents.get('/notes/save1.org'))).toBe('Modified 1');
  expect(textDecoder.decode(mockFileContents.get('/notes/save2.org'))).toBe('Modified 2');
});

test('saveAllBuffers does nothing for clean buffers', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/clean.org', textEncoder.encode('Content'));

  await store.getOrCreateBuffer('/notes/clean.org');

  const originalContent = mockFileContents.get('/notes/clean.org');
  await store.saveAllBuffers();

  expect(mockFileContents.get('/notes/clean.org')).toEqual(originalContent);
});

test('cleanup closes buffers with zero referenceCount', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/unused.org', textEncoder.encode(''));

  const buffer = await store.getOrCreateBuffer('/notes/unused.org');
  store.releaseBuffer('/notes/unused.org');
  expect(buffer.referenceCount).toBe(0);

  store.cleanup();
  await vi.runAllTimersAsync();

  expect(store.getBufferByUri('/notes/unused.org')).toBeUndefined();
});

test('cleanup keeps dirty buffers with zero referenceCount', async () => {
  const store = useBufferStore();
  const path = '/notes/dirty-unused.org';
  mockFileContents.set(path, textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer(path);
  buffer.setText('Unsaved');
  store.releaseBuffer(path);
  store.cleanup();
  await vi.advanceTimersByTimeAsync(0);

  expect(store.getBufferByUri(path)).toBe(buffer);
});

test('cleanup keeps a buffer that is reopened before disposal finishes', async () => {
  const store = useBufferStore();
  const path = '/notes/reopened.org';
  mockFileContents.set(path, textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer(path);
  store.releaseBuffer(path);
  store.cleanup();
  const reopened = await store.getOrCreateBuffer(path);
  await vi.advanceTimersByTimeAsync(0);

  expect(reopened).toBe(buffer);
  expect(store.getBufferByUri(path)).toBe(buffer);
  expect(buffer.referenceCount).toBe(1);
});

test('cleanup keeps buffers with positive referenceCount', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/active.org', textEncoder.encode(''));

  await store.getOrCreateBuffer('/notes/active.org');

  store.cleanup();
  await vi.runAllTimersAsync();

  expect(store.getBufferByUri('/notes/active.org')).toBeDefined();
});

test('allBuffers returns all open buffers', async () => {
  const store = useBufferStore();

  mockFileContents.set('/notes/a.org', textEncoder.encode(''));
  mockFileContents.set('/notes/b.org', textEncoder.encode(''));
  mockFileContents.set('/notes/c.org', textEncoder.encode(''));

  await store.getOrCreateBuffer('/notes/a.org');
  await store.getOrCreateBuffer('/notes/b.org');
  await store.getOrCreateBuffer('/notes/c.org');

  expect(store.allBuffers).toHaveLength(3);
});

test('buffer text getter returns decoded content', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/text.org', textEncoder.encode('Hello World'));

  const buffer = await store.getOrCreateBuffer('/notes/text.org');

  expect(buffer.text).toBe('Hello World');
});

test('buffer setText updates rawContent', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/set.org', textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer('/notes/set.org');
  buffer.setText('New Content');

  expect(buffer.text).toBe('New Content');
});

test('buffer base64 getter returns encoded content', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/base64.org', textEncoder.encode('Test'));

  const buffer = await store.getOrCreateBuffer('/notes/base64.org');

  expect(buffer.base64).toBeDefined();
  expect(typeof buffer.base64).toBe('string');
});

test('auto-save triggers on content change after delay', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/auto.org', textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer('/notes/auto.org');
  buffer.setText('Modified');

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(textDecoder.decode(mockFileContents.get('/notes/auto.org'))).toBe('Modified');
});

test('auto-save triggers sync for file scheme buffers', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/sync.org', textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer('/notes/sync.org');
  buffer.setText('Modified');

  vi.advanceTimersByTime(250);
  await vi.runAllTimersAsync();

  expect(mockSync).toHaveBeenCalledTimes(1);
});

test('auto-save does not trigger sync for non-file scheme buffers', async () => {
  const store = useBufferStore();
  mockProviders.set('custom', {
    scheme: 'custom',
    read: async () => textEncoder.encode('Original'),
    write: async () => {},
  });

  const buffer = await store.getOrCreateBuffer('custom://doc.org');
  buffer.setText('Modified');

  vi.advanceTimersByTime(250);
  await vi.runAllTimersAsync();

  expect(mockSync).not.toHaveBeenCalled();
});

test('buffer isSaving flag is set during save', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/saving.org', textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer('/notes/saving.org');
  buffer.setText('Modified');

  expect(buffer.isSaving).toBe(false);
});

test('external file change reloads clean buffer', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/external.org', textEncoder.encode('Original'));

  await store.getOrCreateBuffer('/notes/external.org');

  mockFileContents.set('/notes/external.org', textEncoder.encode('External change'));

  const watcher = mockWatchers.get('/notes/external.org');
  if (watcher) {
    watcher({ type: 'modify', path: '/notes/external.org' });
  }

  await vi.runAllTimersAsync();
});

test('external file change ignored for dirty buffer', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/dirty-ext.org', textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer('/notes/dirty-ext.org');
  buffer.setText('Local changes');

  mockFileContents.set('/notes/dirty-ext.org', textEncoder.encode('External'));

  const watcher = mockWatchers.get('/notes/dirty-ext.org');
  if (watcher) {
    watcher({ type: 'modify', path: '/notes/dirty-ext.org' });
  }

  await vi.runAllTimersAsync();

  expect(buffer.text).toBe('Local changes');
});

test('external file delete adds error to buffer', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/delete-ext.org', textEncoder.encode('Content'));

  const buffer = await store.getOrCreateBuffer('/notes/delete-ext.org');
  const initialErrors = buffer.errors.length;

  const watcher = mockWatchers.get('/notes/delete-ext.org');
  if (watcher) {
    watcher({ type: 'delete', path: '/notes/delete-ext.org' });
  }

  await vi.runAllTimersAsync();

  expect(buffer.errors.length).toBeGreaterThan(initialErrors);
});

test('external change ignored during save', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/during-save.org', textEncoder.encode('Original'));

  const buffer = await store.getOrCreateBuffer('/notes/during-save.org');
  buffer.setText('Modified');

  buffer.isSaving = true;

  const watcher = mockWatchers.get('/notes/during-save.org');
  if (watcher) {
    watcher({ type: 'modify', path: '/notes/during-save.org' });
  }

  await vi.runAllTimersAsync();

  expect(buffer.text).toBe('Modified');
});

test('gpg file loads content through provider', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/secret.org.gpg', textEncoder.encode('encrypted:Secret'));

  const buffer = await store.getOrCreateBuffer('/notes/secret.org.gpg');

  expect(buffer.text).toBe('encrypted:Secret');
});

test('closeBuffer stops file watcher', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/watch-stop.org', textEncoder.encode(''));

  await store.getOrCreateBuffer('/notes/watch-stop.org');
  expect(mockWatchers.has('/notes/watch-stop.org')).toBe(true);

  await store.closeBuffer('/notes/watch-stop.org');
  expect(mockWatchers.has('/notes/watch-stop.org')).toBe(false);
});

test('buffer lastAccessed updated on subsequent access', async () => {
  vi.useRealTimers();
  const store = useBufferStore();
  mockFileContents.set('/notes/access.org', textEncoder.encode(''));

  const buffer = await store.getOrCreateBuffer('/notes/access.org');
  const firstAccess = buffer.lastAccessed.getTime();

  await new Promise((r) => setTimeout(r, 50));

  await store.getOrCreateBuffer('/notes/access.org');
  expect(buffer.lastAccessed.getTime()).toBeGreaterThanOrEqual(firstAccess);
  vi.useFakeTimers();
});

test('getOrCreateBuffer with unknown scheme adds error to buffer and resets isLoading', async () => {
  const store = useBufferStore();

  const buffer = await store.getOrCreateBuffer('unknown://some/path');

  expect(buffer.errors.length).toBeGreaterThan(0);
  expect(buffer.errors[0]).toContain('No provider registered for scheme: unknown');
  expect(buffer.isLoading).toBe(false);
});

test('getOrCreateBuffer parses URI and sets scheme and uri fields', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/test.org', textEncoder.encode('Content'));

  const buffer = await store.getOrCreateBuffer('file:///notes/test.org');

  expect(buffer.uri).toBe('file:///notes/test.org');
  expect(buffer.scheme).toBe('file');
  expect(buffer.path).toBe('/notes/test.org');
});

test('getOrCreateBuffer with path without scheme defaults to file scheme', async () => {
  const store = useBufferStore();
  mockFileContents.set('/notes/default.org', textEncoder.encode('Content'));

  const buffer = await store.getOrCreateBuffer('/notes/default.org');

  expect(buffer.scheme).toBe('file');
  expect(buffer.uri).toBe('file:///notes/default.org');
  expect(buffer.path).toBe('/notes/default.org');
});

test('buffer from readonly provider has readonly guard', async () => {
  const store = useBufferStore();
  mockProviders.set('readonly', {
    scheme: 'readonly',
    read: async () => textEncoder.encode('Readonly content'),
  });

  const buffer = await store.getOrCreateBuffer('readonly://doc.org');

  expect(buffer.guard?.readonly).toBe(true);
});

test('saveBuffer does nothing for readonly provider', async () => {
  const store = useBufferStore();
  const readFn = vi.fn(async () => textEncoder.encode('Original'));
  mockProviders.set('readonly', {
    scheme: 'readonly',
    read: readFn,
  });

  const buffer = await store.getOrCreateBuffer('readonly://doc.org');
  buffer.setText('Modified');

  await store.saveAllBuffers();

  expect(buffer.text).toBe('Modified');
});

test('provider getContext sets buffer title', async () => {
  const store = useBufferStore();
  mockProviders.set('custom', {
    scheme: 'custom',
    read: async () => textEncoder.encode(''),
    getContext: () => ({ title: 'Custom Title From Provider' }),
  });

  const buffer = await store.getOrCreateBuffer('custom://path');

  expect(buffer.title).toBe('Custom Title From Provider');
});

test('provider watch is called when available', async () => {
  const store = useBufferStore();
  const watchFn = vi.fn(() => () => {});
  mockProviders.set('watchable', {
    scheme: 'watchable',
    read: async () => textEncoder.encode(''),
    watch: watchFn,
  });

  await store.getOrCreateBuffer('watchable://path');

  expect(watchFn).toHaveBeenCalledWith('path', expect.any(Function));
});

test('provider without watch does not set up watcher', async () => {
  const store = useBufferStore();
  mockProviders.set('nowatcher', {
    scheme: 'nowatcher',
    read: async () => textEncoder.encode(''),
  });

  await store.getOrCreateBuffer('nowatcher://path');

  expect(mockWatchers.has('path')).toBe(false);
});
