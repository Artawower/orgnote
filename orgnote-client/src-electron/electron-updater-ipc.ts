import type { BrowserWindow } from 'electron';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';
import type {
  ElectronUpdateCheckOptions,
  ElectronUpdateCheckResult,
  ElectronUpdateInfo,
  ElectronUpdateStatus,
} from './electron-updater-channels';
import { app, ipcMain } from 'electron';
import electronUpdater from 'electron-updater';
import { ELECTRON_UPDATE_CHANNELS } from './electron-updater-channels';

const { autoUpdater } = electronUpdater;

const DEFAULT_UPDATE_CHANNEL = 'latest';
const ELECTRON_UPDATE_CHANNEL = process.env.ORGNOTE_UPDATE_CHANNEL || DEFAULT_UPDATE_CHANNEL;
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

interface RegisterElectronUpdaterIpcParams {
  getMainWindow: () => BrowserWindow | undefined;
}

let isConfigured = false;
let updateCheckInterval: NodeJS.Timeout | undefined;
let currentUpdateFlow: ElectronUpdateCheckOptions | undefined;

const isAutoUpdateAvailable = (): boolean => app.isPackaged;

const createUnavailableResult = (): ElectronUpdateCheckResult => ({ isAvailable: false });

const createUpdateInfo = (info: UpdateInfo): ElectronUpdateInfo => ({
  version: info.version,
  releaseName: info.releaseName,
  releaseDate: info.releaseDate,
});

const createErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message || 'Unknown updater error';
  return 'Unknown updater error';
};

const sendStatus = (
  getMainWindow: () => BrowserWindow | undefined,
  status: ElectronUpdateStatus,
): void => {
  getMainWindow()?.webContents.send(ELECTRON_UPDATE_CHANNELS.status, status);
};

const resolveUpdateFlowOptions = (
  options?: ElectronUpdateCheckOptions,
): Required<ElectronUpdateCheckOptions> => ({
  isBackground: options?.isBackground ?? false,
});

const getCurrentFlowOptions = (): Required<ElectronUpdateCheckOptions> =>
  resolveUpdateFlowOptions(currentUpdateFlow);

const checkForUpdates = async (
  getMainWindow: () => BrowserWindow | undefined,
  options?: ElectronUpdateCheckOptions,
): Promise<ElectronUpdateCheckResult> => {
  if (!isAutoUpdateAvailable()) return createUnavailableResult();

  currentUpdateFlow = resolveUpdateFlowOptions(options);
  sendStatus(getMainWindow, { type: 'checking', ...getCurrentFlowOptions() });
  const result = await autoUpdater.checkForUpdates().catch(() => undefined);
  return { isAvailable: Boolean(result?.updateInfo) };
};

const sendInstallingStatus = (getMainWindow: () => BrowserWindow | undefined): void => {
  sendStatus(getMainWindow, { type: 'installing', ...getCurrentFlowOptions() });
};

const installDownloadedUpdate = (getMainWindow: () => BrowserWindow | undefined): boolean => {
  if (!isAutoUpdateAvailable()) return false;

  sendInstallingStatus(getMainWindow);

  try {
    autoUpdater.quitAndInstall(false, true);
    return true;
  } catch (error) {
    sendErrorStatus(getMainWindow, error);
    return false;
  }
};

const requestScheduledUpdateCheck = (getMainWindow: () => BrowserWindow | undefined): void => {
  void checkForUpdates(getMainWindow, { isBackground: true });
};

const startScheduledUpdateChecks = (getMainWindow: () => BrowserWindow | undefined): void => {
  if (updateCheckInterval) return;

  updateCheckInterval = setInterval(() => {
    requestScheduledUpdateCheck(getMainWindow);
  }, UPDATE_CHECK_INTERVAL_MS);
};

const stopScheduledUpdateChecks = (): void => {
  if (!updateCheckInterval) return;

  clearInterval(updateCheckInterval);
  updateCheckInterval = undefined;
};

const sendInfoStatus = (
  getMainWindow: () => BrowserWindow | undefined,
  type: 'available' | 'not-available' | 'downloaded',
  info: UpdateInfo,
): void => {
  sendStatus(getMainWindow, { type, ...getCurrentFlowOptions(), ...createUpdateInfo(info) });
};

const sendProgressStatus = (
  getMainWindow: () => BrowserWindow | undefined,
  progress: ProgressInfo,
): void => {
  sendStatus(getMainWindow, {
    type: 'download-progress',
    ...getCurrentFlowOptions(),
    percent: progress.percent,
  });
};

const sendErrorStatus = (
  getMainWindow: () => BrowserWindow | undefined,
  error: unknown,
): void => {
  sendStatus(getMainWindow, {
    type: 'error',
    ...getCurrentFlowOptions(),
    message: createErrorMessage(error),
  });
  currentUpdateFlow = undefined;
};

const isPrereleaseUpdateChannel = (): boolean => ELECTRON_UPDATE_CHANNEL !== DEFAULT_UPDATE_CHANNEL;

const configureUpdateChannel = (): void => {
  autoUpdater.channel = ELECTRON_UPDATE_CHANNEL;
  autoUpdater.allowPrerelease = isPrereleaseUpdateChannel();
};

const configureUpdater = (getMainWindow: () => BrowserWindow | undefined): void => {
  if (isConfigured) return;

  configureUpdateChannel();
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info) => sendInfoStatus(getMainWindow, 'available', info));
  autoUpdater.on('update-not-available', (info) => {
    sendInfoStatus(getMainWindow, 'not-available', info);
    currentUpdateFlow = undefined;
  });
  autoUpdater.on('download-progress', (progress) => sendProgressStatus(getMainWindow, progress));
  autoUpdater.on('update-downloaded', (info) => {
    sendInfoStatus(getMainWindow, 'downloaded', info);
    currentUpdateFlow = undefined;
  });
  autoUpdater.on('error', (error) => sendErrorStatus(getMainWindow, error));

  app.once('will-quit', stopScheduledUpdateChecks);
  isConfigured = true;
};

export const registerElectronUpdaterIpc = ({ getMainWindow }: RegisterElectronUpdaterIpcParams): void => {
  configureUpdater(getMainWindow);

  ipcMain.handle(ELECTRON_UPDATE_CHANNELS.checkForUpdates, (_event, options?: ElectronUpdateCheckOptions) =>
    checkForUpdates(getMainWindow, options),
  );
  ipcMain.handle(ELECTRON_UPDATE_CHANNELS.installDownloadedUpdate, () => installDownloadedUpdate(getMainWindow));
  startScheduledUpdateChecks(getMainWindow);
};
