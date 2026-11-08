import type { BrowserWindow, IpcMainEvent } from 'electron';
import { BrowserWindow as ElectronBrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import {
  ELECTRON_KEYBINDING_CHANNELS,
  type ResolvedElectronHotkey,
} from './electron-keybinding-channels';
import { configureExternalNavigation } from './external-navigation';

const TRAFFIC_LIGHT_POSITION = { x: 10, y: 10 };

type ElectronInput = Electron.Input;

interface CreateMainWindowOptions {
  currentDir: string;
  protocolScheme: string;
  onClosed: () => void;
}

const buildProductionUrl = (protocolScheme: string): string => `${protocolScheme}://./index.html`;

const loadInitialUrl = async (window: BrowserWindow, protocolScheme: string): Promise<void> => {
  if (process.env.DEV) {
    await window.loadURL(process.env.APP_URL);
    return;
  }
  await window.loadURL(buildProductionUrl(protocolScheme));
};

const isTruthyEnv = (value: unknown): boolean => value === true || value === 'true';

const isDevtoolsAllowed = (): boolean =>
  isTruthyEnv(process.env.DEBUGGING) || isTruthyEnv(process.env.ORGNOTE_ENABLE_DEVTOOLS);

const configureDevTools = (window: BrowserWindow): void => {
  if (isTruthyEnv(process.env.DEBUGGING)) {
    window.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  if (isDevtoolsAllowed()) return;

  window.webContents.on('devtools-opened', () => {
    window.webContents.closeDevTools();
  });
};

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isResolvedHotkey = (payload: unknown): payload is ResolvedElectronHotkey => {
  if (!payload || typeof payload !== 'object') return false;
  const hotkey = payload as Record<string, unknown>;
  return (
    typeof hotkey.key === 'string' &&
    isBoolean(hotkey.control) &&
    isBoolean(hotkey.meta) &&
    isBoolean(hotkey.alt) &&
    isBoolean(hotkey.shift)
  );
};

const readHotkeys = (payload: unknown): ResolvedElectronHotkey[] => {
  if (!Array.isArray(payload)) return [];
  return payload.filter(isResolvedHotkey);
};

const hotkeyMatchesInput = (hotkey: ResolvedElectronHotkey, input: ElectronInput): boolean =>
  input.key.toLowerCase() === hotkey.key.toLowerCase() &&
  input.control === hotkey.control &&
  input.meta === hotkey.meta &&
  input.alt === hotkey.alt &&
  input.shift === hotkey.shift;

const configureMenuShortcutPassthrough = (window: BrowserWindow): void => {
  let appHotkeys: ResolvedElectronHotkey[] = [];

  const updateAppHotkeys = (event: IpcMainEvent, payload: unknown): void => {
    if (event.sender !== window.webContents) return;
    appHotkeys = readHotkeys(payload);
  };

  const updateMenuShortcutMode = (_event: Electron.Event, input: ElectronInput): void => {
    const isAppHotkey = appHotkeys.some((hotkey) => hotkeyMatchesInput(hotkey, input));
    window.webContents.setIgnoreMenuShortcuts(isAppHotkey);
  };

  ipcMain.on(ELECTRON_KEYBINDING_CHANNELS.setAppHotkeys, updateAppHotkeys);
  window.webContents.on('before-input-event', updateMenuShortcutMode);
  window.on('closed', () => {
    ipcMain.removeListener(ELECTRON_KEYBINDING_CHANNELS.setAppHotkeys, updateAppHotkeys);
  });
};

export async function createMainWindow(options: CreateMainWindowOptions): Promise<BrowserWindow> {
  const window = new ElectronBrowserWindow({
    icon: path.resolve(options.currentDir, 'icons/icon.png'),
    width: 1000,
    height: 600,
    useContentSize: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: TRAFFIC_LIGHT_POSITION,
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(
        options.currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
  });

  configureExternalNavigation(window.webContents, (url) => shell.openExternal(url));
  configureDevTools(window);
  configureMenuShortcutPassthrough(window);
  window.on('closed', options.onClosed);
  await loadInitialUrl(window, options.protocolScheme);
  return window;
}
