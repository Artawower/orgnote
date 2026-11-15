import type { BrowserWindow } from 'electron';
import { app, ipcMain, protocol } from 'electron';
import os from 'os';
import { fileURLToPath } from 'url';
import { ORGNOTE_PROTOCOL } from '../src/constants/orgnote-scheme';
import { startAuthCallbackServer } from './auth-callback-server';
import { registerDeepLinking } from './deeplink';
import { registerElectronFsIpc, stopElectronFsWatchers } from './electron-fs-ipc';
import { registerElectronUpdaterIpc } from './electron-updater-ipc';
import { registerHistoryFallbackProtocol } from './history-fallback-protocol';
import { createMainWindow } from './main-window';
import { registerOAuthLoginIpc } from './oauth-login-ipc';

const platform = process.platform || os.platform();

const TITLE_BAR_HEIGHT = 30;
const TITLE_BAR_SYMBOL_COLOR = '#ffffff';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

const AUTH_CALLBACK_PORT = 17432;
const AUTH_CALLBACK_HOST = '127.0.0.1';
const ALLOWED_AUTH_ORIGINS = [
  'http://localhost:8000',
  'https://org-note.com',
  'https://dev.org-note.com',
];

let mainWindow: BrowserWindow | undefined;
let stopAuthCallbackServer: (() => void) | undefined;

const PROTOCOL_SCHEME = 'app';

protocol.registerSchemesAsPrivileged([
  {
    scheme: PROTOCOL_SCHEME,
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const sendNavigateEvent = (route: string): void => {
  mainWindow?.webContents.send('navigate', route);
};

const focusMainWindow = (): void => {
  mainWindow?.focus();
};

const restoreAndFocusMainWindow = (): void => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
};

registerDeepLinking({
  protocolName: ORGNOTE_PROTOCOL,
  onRoute: sendNavigateEvent,
  onSecondInstance: restoreAndFocusMainWindow,
});

app.whenReady().then(async () => {
  registerHistoryFallbackProtocol({ scheme: PROTOCOL_SCHEME, baseDir: currentDir });
  registerOAuthLoginIpc({ allowedOrigins: ALLOWED_AUTH_ORIGINS });
  registerElectronFsIpc({ getMainWindow: () => mainWindow });
  registerElectronUpdaterIpc({ getMainWindow: () => mainWindow });

  stopAuthCallbackServer = startAuthCallbackServer({
    port: AUTH_CALLBACK_PORT,
    host: AUTH_CALLBACK_HOST,
    onRoute: sendNavigateEvent,
    onFocus: focusMainWindow,
  });

  mainWindow = await createMainWindow({
    currentDir,
    protocolScheme: PROTOCOL_SCHEME,
    onClosed: () => {
      mainWindow = undefined;
    },
  });

  ipcMain.handle('setHeaderColor', (_, color: string) => {
    if (!mainWindow) {
      return;
    }
    mainWindow.setBackgroundColor(color);
    if (process.platform === 'win32') {
      mainWindow.setTitleBarOverlay({
        color,
        symbolColor: TITLE_BAR_SYMBOL_COLOR,
        height: TITLE_BAR_HEIGHT,
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopAuthCallbackServer?.();
  stopAuthCallbackServer = undefined;
  void stopElectronFsWatchers();
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    void createMainWindow({
      currentDir,
      protocolScheme: PROTOCOL_SCHEME,
      onClosed: () => {
        mainWindow = undefined;
      },
    }).then((window) => {
      mainWindow = window;
    });
  }
});
