import { EventEmitter } from 'node:events';
import nodeFs from 'node:fs';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import type { FileSystemChange } from 'orgnote-api';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ELECTRON_FS_CHANNELS } from './electron-fs-channels';

type IpcHandler = (event: unknown, ...args: unknown[]) => unknown;
type NativeWatchListener = (eventType: nodeFs.WatchEventType, fileName: string | null) => void;

const ipcHandlers = vi.hoisted(() => new Map<string, IpcHandler>());

vi.mock('electron', () => ({
  dialog: { showOpenDialog: vi.fn() },
  ipcMain: {
    handle: (channel: string, handler: IpcHandler) => ipcHandlers.set(channel, handler),
  },
}));

const VAULT_DIRECTORIES = 20;
const FILES_PER_DIRECTORY = 25;
const EVENT_TIMEOUT = 5000;
const SETTLE_DELAY = 600;
const PROBE_INTERVAL = 150;
const BURST_WRITES = 5;
const BURST_WRITE_GAP = 40;
const IS_SINGLE_HANDLE_PLATFORM = process.platform !== 'linux';

interface WatchEventPayload {
  watchId: number;
  change: FileSystemChange;
}

interface FakeNativeWatcher {
  watcher: EventEmitter & { close: ReturnType<typeof vi.fn> };
  emit: NativeWatchListener;
}

const sentEvents: WatchEventPayload[] = [];
const mainWindow = {
  webContents: {
    send: (_channel: string, payload: WatchEventPayload) => sentEvents.push(payload),
  },
};

let vaultPath: string;
let outsidePath: string;
let watchId: number | undefined;

const invoke = (channel: string, ...args: unknown[]): unknown => {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new TypeError(`IPC handler is not registered: ${channel}`);
  return handler({}, ...args);
};

const writeNotes = async (directory: string, count: number): Promise<void> => {
  await fs.mkdir(directory, { recursive: true });
  const files = Array.from({ length: count }, (_, index) => path.join(directory, `note-${index}.org`));
  await Promise.all(files.map((file) => fs.writeFile(file, '* note')));
};

const createVault = async (): Promise<string> => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'orgnote-vault-')));
  const directories = Array.from({ length: VAULT_DIRECTORIES }, (_, index) => path.join(root, `dir-${index}`));
  await Promise.all(directories.map((directory) => writeNotes(directory, FILES_PER_DIRECTORY)));
  return root;
};

const spyOnNativeWatch = () => {
  const spy = vi.spyOn(nodeFs, 'watch');
  syncBuiltinESMExports();
  return spy;
};

const mockNativeWatch = (): FakeNativeWatcher => {
  const watcher = Object.assign(new EventEmitter(), { close: vi.fn() });
  const listeners: NativeWatchListener[] = [];
  spyOnNativeWatch().mockImplementation(((_root: string, _options: unknown, listener: NativeWatchListener) => {
    listeners.push(listener);
    return watcher;
  }) as unknown as typeof nodeFs.watch);
  return {
    watcher,
    emit: (eventType, fileName) => listeners.forEach((listener) => listener(eventType, fileName)),
  };
};

const startWatch = async (): Promise<number> => {
  await invoke(ELECTRON_FS_CHANNELS.mountRoot, vaultPath);
  watchId = (await invoke(ELECTRON_FS_CHANNELS.watchStart)) as number;
  return watchId;
};

const changesFor = (logicalPath: string): FileSystemChange[] =>
  sentEvents
    .filter((event) => event.watchId === watchId && event.change.path === logicalPath)
    .map((event) => event.change);

const waitForChange = (predicate: (change: FileSystemChange) => boolean) =>
  vi.waitFor(
    () => {
      const found = sentEvents.find((event) => event.watchId === watchId && predicate(event.change));
      if (!found) throw new Error('Expected watch event was not sent');
      return found.change;
    },
    { timeout: EVENT_TIMEOUT },
  );

const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY));

const waitForNativeStream = () =>
  vi.waitFor(
    () => {
      nodeFs.appendFileSync(path.join(vaultPath, 'stream-probe.org'), '* probe\n');
      if (!sentEvents.some((event) => event.change.path === '/stream-probe.org')) {
        throw new Error('Native watch stream is not delivering events yet');
      }
    },
    { timeout: EVENT_TIMEOUT, interval: PROBE_INTERVAL },
  );

const startLiveWatch = async (): Promise<void> => {
  await startWatch();
  await waitForNativeStream();
  await settle();
  sentEvents.length = 0;
};

beforeEach(async () => {
  vi.resetModules();
  ipcHandlers.clear();
  sentEvents.length = 0;
  vaultPath = await createVault();
  outsidePath = await fs.mkdtemp(path.join(os.tmpdir(), 'orgnote-outside-'));
  const { registerElectronFsIpc } = await import('./electron-fs-ipc');
  registerElectronFsIpc({ getMainWindow: () => mainWindow as never });
});

afterEach(async () => {
  if (watchId !== undefined) await invoke(ELECTRON_FS_CHANNELS.watchStop, watchId);
  watchId = undefined;
  vi.restoreAllMocks();
  syncBuiltinESMExports();
  await fs.rm(vaultPath, { recursive: true, force: true });
  await fs.rm(outsidePath, { recursive: true, force: true });
});

test.runIf(IS_SINGLE_HANDLE_PLATFORM)(
  'watchStart opens a single native watcher regardless of the number of files',
  async () => {
    const watchSpy = spyOnNativeWatch();

    await startLiveWatch();

    expect(watchSpy).toHaveBeenCalledTimes(1);
  },
);

test('watchStart reports a created file as a logical vault path', async () => {
  await startLiveWatch();

  await fs.writeFile(path.join(vaultPath, 'dir-1', 'created.org'), '* created');

  const change = await waitForChange((item) => item.path === '/dir-1/created.org');
  expect(change.type).toBe('create');
});

test('watchStart reports a change of an existing file as modify with its mtime', async () => {
  await startLiveWatch();

  await fs.appendFile(path.join(vaultPath, 'dir-2', 'note-3.org'), '\n** updated');

  const change = await waitForChange((item) => item.path === '/dir-2/note-3.org');
  expect(change.type).toBe('modify');
  expect(change.mtime).toEqual(expect.any(Number));
});

test('watchStart reports a deleted file', async () => {
  await startLiveWatch();

  await fs.rm(path.join(vaultPath, 'dir-3', 'note-4.org'));

  const change = await waitForChange((item) => item.path === '/dir-3/note-4.org');
  expect(change.type).toBe('delete');
});

test('watchStart coalesces a burst of writes into a single change', async () => {
  await startLiveWatch();
  const notePath = path.join(vaultPath, 'dir-5', 'note-1.org');

  for (const index of Array.from({ length: BURST_WRITES }, (_, value) => value)) {
    await fs.appendFile(notePath, `\n** part ${index}`);
    await new Promise((resolve) => setTimeout(resolve, BURST_WRITE_GAP));
  }
  await waitForChange((item) => item.path === '/dir-5/note-1.org');
  await settle();

  expect(changesFor('/dir-5/note-1.org')).toHaveLength(1);
});

test('watchStart reports nested files of a directory moved into the vault', async () => {
  await writeNotes(path.join(outsidePath, 'project', 'nested'), 2);
  await startLiveWatch();

  await fs.rename(path.join(outsidePath, 'project'), path.join(vaultPath, 'project'));

  const change = await waitForChange((item) => item.path === '/project/nested/note-1.org');
  expect(change.type).toBe('create');
});

test('watchStart reports nested files as deleted when a directory is moved out of the vault', async () => {
  await startLiveWatch();

  await fs.rename(path.join(vaultPath, 'dir-6'), path.join(outsidePath, 'dir-6'));

  const change = await waitForChange((item) => item.path === '/dir-6/note-2.org');
  expect(change.type).toBe('delete');
});

test('watchStart does not report a deletion when stat fails with a non-missing error', async () => {
  const native = mockNativeWatch();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const accessDenied = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
  await startWatch();
  vi.spyOn(fs, 'stat').mockRejectedValue(accessDenied);
  vi.spyOn(fs, 'lstat').mockRejectedValue(accessDenied);

  native.emit('change', 'dir-7/note-0.org');
  await settle();

  expect(changesFor('/dir-7/note-0.org')).toEqual([]);
  expect(consoleError).toHaveBeenCalledWith(expect.any(String), expect.any(String), accessDenied);
});

test('watchStart logs native watcher errors instead of crashing the main process', async () => {
  const native = mockNativeWatch();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const emfile = Object.assign(new Error('EMFILE: too many open files, watch'), { code: 'EMFILE' });

  await startWatch();

  expect(() => native.watcher.emit('error', emfile)).not.toThrow();
  expect(consoleError).toHaveBeenCalledWith(expect.any(String), emfile);
});

test('watchStop closes the native watcher and drops pending changes', async () => {
  const native = mockNativeWatch();
  const id = await startWatch();

  native.emit('change', 'dir-8/note-0.org');
  await invoke(ELECTRON_FS_CHANNELS.watchStop, id);
  watchId = undefined;
  await settle();

  expect(native.watcher.close).toHaveBeenCalledTimes(1);
  expect(sentEvents).toEqual([]);
});

test('watchStart closes the native watcher when the initial vault scan fails', async () => {
  const native = mockNativeWatch();
  const scanFailure = Object.assign(new Error('EIO: i/o error, scandir'), { code: 'EIO' });
  await invoke(ELECTRON_FS_CHANNELS.mountRoot, vaultPath);
  vi.spyOn(fs, 'readdir').mockRejectedValue(scanFailure);

  await expect(invoke(ELECTRON_FS_CHANNELS.watchStart)).rejects.toBe(scanFailure);

  expect(native.watcher.close).toHaveBeenCalledTimes(1);
});
