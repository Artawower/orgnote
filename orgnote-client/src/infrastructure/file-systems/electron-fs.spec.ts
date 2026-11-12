import { beforeEach, expect, test, vi } from 'vitest';
import { useElectronFs } from './electron-fs';
import type { ElectronAPI } from 'src/types/global';

const createElectronApi = () => ({
  setHeaderColor: vi.fn(),
  auth: vi.fn(),
  onNavigate: vi.fn(),
  fs: {
    selectDirectory: vi.fn(),
    mountRoot: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readDir: vi.fn(),
    fileInfo: vi.fn(),
    rename: vi.fn(),
    deleteFile: vi.fn(),
    rmdir: vi.fn(),
    mkdir: vi.fn(),
    utime: vi.fn(),
    copyFile: vi.fn(),
    watchStart: vi.fn(),
    watchStop: vi.fn(),
    onWatchEvent: vi.fn(),
  },
});

let electronApi: ReturnType<typeof createElectronApi>;

beforeEach(() => {
  electronApi = createElectronApi();
  window.electron = electronApi as unknown as ElectronAPI;
});

test('electron fs init asks for directory when root is missing', async () => {
  electronApi.fs.selectDirectory.mockResolvedValue('/vault');

  const fs = useElectronFs();
  const params = await fs.init?.();

  expect(params).toEqual({ root: '/vault' });
  expect(electronApi.fs.selectDirectory).toHaveBeenCalledTimes(1);
});

test('electron fs init rejects cancelled directory selection', async () => {
  electronApi.fs.selectDirectory.mockResolvedValue(undefined);

  const fs = useElectronFs();

  await expect(fs.init?.()).rejects.toThrow('Electron vault selection cancelled');
});

test('electron fs mount delegates root to preload api', async () => {
  electronApi.fs.mountRoot.mockResolvedValue(true);

  const fs = useElectronFs();
  const mounted = await fs.mount?.({ root: '/vault' });

  expect(mounted).toBe(true);
  expect(electronApi.fs.mountRoot).toHaveBeenCalledWith('/vault');
});

test('electron fs forwards basic file operations', async () => {
  electronApi.fs.readFile.mockResolvedValue('content');

  const fs = useElectronFs();
  const content = await fs.readFile('/note.org');
  await fs.writeFile('/note.org', 'next');
  await fs.rename('/note.org', '/renamed.org');
  await fs.deleteFile('/renamed.org');

  expect(content).toBe('content');
  expect(electronApi.fs.writeFile).toHaveBeenCalledWith('/note.org', 'next', undefined);
  expect(electronApi.fs.rename).toHaveBeenCalledWith('/note.org', '/renamed.org');
  expect(electronApi.fs.deleteFile).toHaveBeenCalledWith('/renamed.org');
});

test('electron fs watch forwards only matching watch events', async () => {
  const unsubscribe = vi.fn();
  let watchCallback: ((event: { watchId: number; change: { path: string; type: 'create' } }) => void) | undefined;
  electronApi.fs.mountRoot.mockResolvedValue(true);
  electronApi.fs.watchStart.mockResolvedValue(7);
  electronApi.fs.onWatchEvent.mockImplementation((callback) => {
    watchCallback = callback;
    return unsubscribe;
  });

  const listener = vi.fn();
  const fs = useElectronFs();
  const handle = await fs.watch?.(listener, { root: '/vault' });

  watchCallback?.({ watchId: 8, change: { path: '/other.org', type: 'create' } });
  watchCallback?.({ watchId: 7, change: { path: '/note.org', type: 'create' } });
  await handle?.stop();

  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith({ path: '/note.org', type: 'create' });
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(electronApi.fs.watchStop).toHaveBeenCalledWith(7);
});
