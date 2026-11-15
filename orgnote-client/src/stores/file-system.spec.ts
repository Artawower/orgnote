import { beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { DiskFile, FileSystem, FileSystemInfo } from 'orgnote-api';
import { ErrorFileNotFound } from 'orgnote-api';
import { useFileSystemManagerStore } from './file-system-manager';
import { useFileSystemStore } from './file-system';
import { useSettingsStore } from './settings';
import { useFileWatcherStore } from './file-watcher';

const createDiskFile = (path: string, mtime: number): DiskFile => ({
  path,
  mtime,
  name: path.split('/').pop() ?? '',
  type: 'file',
  size: 0,
});

const createReadFile = (utf8Content: string): FileSystem['readFile'] => {
  const readFile: FileSystem['readFile'] = async (path, encoding) => {
    void path;
    if (encoding === 'binary') {
      return new TextEncoder().encode(utf8Content) as never;
    }
    return utf8Content as never;
  };
  return readFile;
};

beforeEach(() => {
  setActivePinia(createPinia());
});

test('writeFile does not emit changes for extension runtime files', async () => {
  const mockFs: FileSystem = {
    readFile: createReadFile(''),
    writeFile: vi.fn(async () => undefined),
    readDir: vi.fn(async () => []),
    fileInfo: vi.fn(async (path: string) => createDiskFile(path, 100)),
    rename: vi.fn(async () => undefined),
    deleteFile: vi.fn(async () => undefined),
    rmdir: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => undefined),
    isDirExist: vi.fn(async () => true),
    isFileExist: vi.fn(async () => true),
    utimeSync: vi.fn(async () => undefined),
  };
  const fsInfo: FileSystemInfo = {
    name: 'mock-fs',
    fs: () => mockFs,
    type: 'web',
    initialVault: '/',
  };
  useSettingsStore().settings.vault = '/';
  const fsManager = useFileSystemManagerStore();
  fsManager.register(fsInfo);
  fsManager.currentFsName = 'mock-fs';
  const emitChange = vi.spyOn(useFileWatcherStore(), 'emitChange');
  const store = useFileSystemStore();

  await store.writeFile('.orgnote/extensions/excalidraw/0.1.1/index.js', '');

  expect(mockFs.writeFile).toHaveBeenCalledOnce();
  expect(mockFs.fileInfo).not.toHaveBeenCalled();
  expect(emitChange).not.toHaveBeenCalled();
});

test('syncFile returns disk content when disk is newer', async () => {
  const mockFs: FileSystem = {
    readFile: createReadFile('disk-content'),
    writeFile: vi.fn(async () => undefined),
    readDir: vi.fn(async () => []),
    fileInfo: vi.fn(async (path: string) => createDiskFile(path, 200)),
    rename: vi.fn(async () => undefined),
    deleteFile: vi.fn(async () => undefined),
    rmdir: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => undefined),
    isDirExist: vi.fn(async () => true),
    isFileExist: vi.fn(async () => true),
    utimeSync: vi.fn(async () => undefined),
  };
  const readFileSpy = vi.spyOn(mockFs, 'readFile');

  const fsInfo: FileSystemInfo = {
    name: 'mock-fs',
    fs: () => mockFs,
    type: 'web',
    initialVault: '/',
  };

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = '/';

  const fsManager = useFileSystemManagerStore();
  fsManager.register(fsInfo);
  fsManager.currentFsName = 'mock-fs';

  const store = useFileSystemStore();

  const result = await store.syncFile('test.txt', 'store-content', 100);

  expect(result).toBe('disk-content');
  expect(readFileSpy).toHaveBeenCalledWith('/test.txt', 'utf8');
  expect(mockFs.writeFile).not.toHaveBeenCalled();
});

test('syncFile writes when disk is missing', async () => {
  const mockFs: FileSystem = {
    readFile: createReadFile('disk-content'),
    writeFile: vi.fn(async () => undefined),
    readDir: vi.fn(async () => []),
    fileInfo: vi.fn(async () => undefined),
    rename: vi.fn(async () => undefined),
    deleteFile: vi.fn(async () => undefined),
    rmdir: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => undefined),
    isDirExist: vi.fn(async () => true),
    isFileExist: vi.fn(async () => false),
    utimeSync: vi.fn(async () => undefined),
  };

  const fsInfo: FileSystemInfo = {
    name: 'mock-fs',
    fs: () => mockFs,
    type: 'web',
    initialVault: '/',
  };

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = '/';

  const fsManager = useFileSystemManagerStore();
  fsManager.register(fsInfo);
  fsManager.currentFsName = 'mock-fs';

  const store = useFileSystemStore();

  const result = await store.syncFile('test.txt', 'store-content', 100);

  expect(result).toBeUndefined();
  expect(mockFs.writeFile).toHaveBeenCalledWith('/test.txt', 'store-content', 'utf8');
});

test('syncFile does nothing when disk mtime equals time', async () => {
  const mockFs: FileSystem = {
    readFile: createReadFile('disk-content'),
    writeFile: vi.fn(async () => undefined),
    readDir: vi.fn(async () => []),
    fileInfo: vi.fn(async (path: string) => createDiskFile(path, 100)),
    rename: vi.fn(async () => undefined),
    deleteFile: vi.fn(async () => undefined),
    rmdir: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => undefined),
    isDirExist: vi.fn(async () => true),
    isFileExist: vi.fn(async () => true),
    utimeSync: vi.fn(async () => undefined),
  };
  const readFileSpy = vi.spyOn(mockFs, 'readFile');

  const fsInfo: FileSystemInfo = {
    name: 'mock-fs',
    fs: () => mockFs,
    type: 'web',
    initialVault: '/',
  };

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = '/';

  const fsManager = useFileSystemManagerStore();
  fsManager.register(fsInfo);
  fsManager.currentFsName = 'mock-fs';

  const store = useFileSystemStore();

  const result = await store.syncFile('test.txt', 'store-content', 100);

  expect(result).toBeUndefined();
  expect(readFileSpy).not.toHaveBeenCalled();
  expect(mockFs.writeFile).not.toHaveBeenCalled();
});

const encodeText = (text: string): Uint8Array => new TextEncoder().encode(text);
const decodeText = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

const resolveDiskPath = (path: string): string => path.replace(/\/+/g, '/');

const createMemoryFs = (initialFiles: Record<string, string>) => {
  const files = new Map(Object.entries(initialFiles).map(([path, text]) => [path, encodeText(text)]));
  const get = (path: string) => files.get(resolveDiskPath(path));
  const fs: FileSystem = {
    readFile: (async (path: string, encoding?: 'utf8' | 'binary') => {
      const content = get(path);
      if (!content) throw new ErrorFileNotFound(path);
      return encoding === 'binary' ? content : decodeText(content);
    }) as FileSystem['readFile'],
    writeFile: vi.fn(async (path: string, content: string | Uint8Array) => {
      files.set(resolveDiskPath(path), typeof content === 'string' ? encodeText(content) : content);
    }),
    readDir: vi.fn(async () => []),
    fileInfo: vi.fn(async (path: string) => createDiskFile(path, 100)),
    rename: vi.fn(async (path: string, newPath: string) => {
      const movedEntries = [...files].filter(
        ([filePath]) => filePath === path || filePath.startsWith(`${path}/`),
      );
      movedEntries.forEach(([filePath, content]) => {
        files.delete(filePath);
        files.set(newPath + filePath.slice(path.length), content);
      });
    }),
    deleteFile: vi.fn(async (path: string) => {
      files.delete(path);
    }),
    rmdir: vi.fn(async (path: string) => {
      const prefix = path.endsWith('/') ? path : `${path}/`;
      [...files.keys()]
        .filter((filePath) => filePath.startsWith(prefix))
        .forEach((filePath) => files.delete(filePath));
    }),
    mkdir: vi.fn(async () => undefined),
    isDirExist: vi.fn(async () => true),
    isFileExist: vi.fn(async () => true),
    utimeSync: vi.fn(async () => undefined),
  };
  return { fs, hasFile: (path: string) => files.has(path), readText: (path: string) => decodeText(files.get(path) ?? new Uint8Array()) };
};

const mountMemoryFs = (initialFiles: Record<string, string>) => {
  const memoryFs = createMemoryFs(initialFiles);
  useSettingsStore().settings.vault = '/';
  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'memory-fs', fs: () => memoryFs.fs, type: 'web', initialVault: '/' });
  fsManager.currentFsName = 'memory-fs';
  return { ...memoryFs, store: useFileSystemStore() };
};

const appendText =
  (suffix: string) =>
  async (content: Uint8Array): Promise<Uint8Array> =>
    encodeText(decodeText(content) + suffix);

test('updateFile writes the transformed file content', async () => {
  const { store, readText } = mountMemoryFs({ '/work.org': '* TODO task' });

  const isWritten = await store.updateFile('/work.org', appendText(' :urgent:'));

  expect(isWritten).toBe(true);
  expect(readText('/work.org')).toBe('* TODO task :urgent:');
});

test('updateFile does not overwrite a write that arrives while it transforms the content', async () => {
  const { store, readText } = mountMemoryFs({ '/work.org': '* TODO task' });
  let releaseTransform: () => void = () => undefined;
  const transformGate = new Promise<void>((resolve) => {
    releaseTransform = resolve;
  });

  const update = store.updateFile('/work.org', async (content) => {
    await transformGate;
    return appendText(' :urgent:')(content);
  });
  const syncedWrite = store.writeFile('/work.org', '* DONE task');
  releaseTransform();
  await Promise.all([update, syncedWrite]);

  expect(readText('/work.org')).toBe('* DONE task');
});

test('updateFile applies concurrent updates on top of each other', async () => {
  const { store, readText } = mountMemoryFs({ '/work.org': '* TODO task' });

  await Promise.all([
    store.updateFile('/work.org', appendText(' :urgent:')),
    store.updateFile('/work.org', appendText(' :home:')),
  ]);

  expect(readText('/work.org')).toBe('* TODO task :urgent: :home:');
});

test('updateFile does not recreate a file deleted while it transforms the content', async () => {
  const { store, hasFile } = mountMemoryFs({ '/work.org': '* TODO task' });
  let releaseTransform: () => void = () => undefined;
  const transformGate = new Promise<void>((resolve) => {
    releaseTransform = resolve;
  });

  const update = store.updateFile('/work.org', async (content) => {
    await transformGate;
    return appendText(' :urgent:')(content);
  });
  const deletion = store.deleteFile('/work.org');
  releaseTransform();
  await Promise.all([update, deletion]);

  expect(hasFile('/work.org')).toBe(false);
});

test('updateFile does not recreate the old path of a file renamed while it transforms', async () => {
  const { store, hasFile, readText } = mountMemoryFs({ '/work.org': '* TODO task' });
  let releaseTransform: () => void = () => undefined;
  const transformGate = new Promise<void>((resolve) => {
    releaseTransform = resolve;
  });

  const update = store.updateFile('/work.org', async (content) => {
    await transformGate;
    return appendText(' :urgent:')(content);
  });
  const renaming = store.rename('/work.org', '/archive.org');
  releaseTransform();
  await Promise.all([update, renaming]);

  expect(hasFile('/work.org')).toBe(false);
  expect(readText('/archive.org')).toBe('* TODO task :urgent:');
});

test('updateFile starts a missing file from empty content', async () => {
  const { store, readText } = mountMemoryFs({});

  const isWritten = await store.updateFile('/inbox.org', appendText('* TODO new task\n'));

  expect(isWritten).toBe(true);
  expect(readText('/inbox.org')).toBe('* TODO new task\n');
});

test('updateFile serializes updates that address the same file through equivalent paths', async () => {
  const { store, readText } = mountMemoryFs({ '/notes/work.org': '* TODO task' });

  await Promise.all([
    store.updateFile('/notes/work.org', appendText(' :urgent:')),
    store.updateFile('/notes//work.org', appendText(' :home:')),
  ]);

  expect(readText('/notes/work.org')).toBe('* TODO task :urgent: :home:');
});

test('updateFile finishes before its directory is renamed and does not recreate the old directory', async () => {
  const { store, hasFile, readText } = mountMemoryFs({ '/notes/work.org': '* TODO task' });
  let releaseTransform: () => void = () => undefined;
  const transformGate = new Promise<void>((resolve) => {
    releaseTransform = resolve;
  });

  const update = store.updateFile('/notes/work.org', async (content) => {
    await transformGate;
    return appendText(' :urgent:')(content);
  });
  const directoryRename = store.rename('/notes', '/archive');
  releaseTransform();
  await Promise.all([update, directoryRename]);

  expect(hasFile('/notes/work.org')).toBe(false);
  expect(readText('/archive/work.org')).toBe('* TODO task :urgent:');
});

test('writeFile queued behind an update is cancelled when the file system changes meanwhile', async () => {
  const { store } = mountMemoryFs({ '/work.org': '* TODO task' });
  const otherFs = createMemoryFs({ '/work.org': '* TODO other vault' });
  useFileSystemManagerStore().register({
    name: 'other-fs',
    fs: () => otherFs.fs,
    type: 'web',
    initialVault: '/',
  });
  let releaseTransform: () => void = () => undefined;
  const transformGate = new Promise<void>((resolve) => {
    releaseTransform = resolve;
  });

  const update = store.updateFile('/work.org', async (content) => {
    await transformGate;
    return appendText(' :urgent:')(content);
  });
  const queuedWrite = store.writeFile('/work.org', '* DONE task');
  useFileSystemManagerStore().currentFsName = 'other-fs';
  releaseTransform();
  const results = await Promise.allSettled([update, queuedWrite]);

  expect(otherFs.readText('/work.org')).toBe('* TODO other vault');
  expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
});

test('updateFile paused before its directory is removed does not recreate the file', async () => {
  const { store, hasFile } = mountMemoryFs({ '/notes/work.org': '* TODO task' });
  let releaseTransform: () => void = () => undefined;
  const transformGate = new Promise<void>((resolve) => {
    releaseTransform = resolve;
  });

  const update = store.updateFile('/notes/work.org', async (content) => {
    await transformGate;
    return appendText(' :urgent:')(content);
  });
  const directoryRemoval = store.rmdir('/notes');
  releaseTransform();
  await Promise.all([update, directoryRemoval]);

  expect(hasFile('/notes/work.org')).toBe(false);
});

const createRemountableFs = () => {
  const files = new Map<string, string>();
  let root = '';
  let releaseWrite: () => void = () => undefined;
  const writeGate = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  const fs = {
    ...createMemoryFs({}).fs,
    init: vi.fn(async () => undefined),
    mount: vi.fn(async (params?: { root?: string }) => {
      root = params?.root ?? '';
      return true;
    }),
    writeFile: vi.fn(async (path: string, content: string | Uint8Array) => {
      await writeGate;
      files.set(`${root}${path}`, typeof content === 'string' ? content : decodeText(content));
    }),
  } as FileSystem;
  return { fs, releaseWrite, readText: (path: string) => files.get(path) };
};

test('writeFile in flight keeps its vault when the same file system is remounted to another root', async () => {
  const remountable = createRemountableFs();
  const settings = useSettingsStore();
  settings.settings.vault = '/vault-a';
  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'remountable', fs: () => remountable.fs, type: 'web', initialVault: '/vault-a' });
  fsManager.currentFsName = 'remountable';
  await vi.waitFor(() => expect(fsManager.currentSession?.root).toBe('/vault-a'));
  const store = useFileSystemStore();

  const write = store.writeFile('/work.org', '* TODO from vault A');
  await vi.waitFor(() => expect(remountable.fs.writeFile).toHaveBeenCalled());
  settings.settings.vault = '/vault-b';
  await new Promise((resolve) => setTimeout(resolve, 20));
  remountable.releaseWrite();
  await write;
  await vi.waitFor(() => expect(fsManager.currentSession?.root).toBe('/vault-b'));

  expect(remountable.readText('/vault-a/work.org')).toBe('* TODO from vault A');
  expect(remountable.readText('/vault-b/work.org')).toBeUndefined();
});

test('dropFileSystem queued behind an update is cancelled when the file system changes meanwhile', async () => {
  const { store } = mountMemoryFs({ '/work.org': '* TODO task' });
  const otherFs = createMemoryFs({ '/work.org': '* TODO other vault' });
  useFileSystemManagerStore().register({
    name: 'other-fs',
    fs: () => otherFs.fs,
    type: 'web',
    initialVault: '/',
  });
  let releaseTransform: () => void = () => undefined;
  const transformGate = new Promise<void>((resolve) => {
    releaseTransform = resolve;
  });

  const update = store.updateFile('/work.org', async (content) => {
    await transformGate;
    return content;
  });
  const drop = store.dropFileSystem();
  useFileSystemManagerStore().currentFsName = 'other-fs';
  releaseTransform();
  const results = await Promise.allSettled([update, drop]);

  expect(otherFs.hasFile('/work.org')).toBe(true);
  expect(results[1]?.status).toBe('rejected');
});
