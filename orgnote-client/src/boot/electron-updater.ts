import type { ElectronUpdateInfo, ElectronUpdateStatus } from '../../src-electron/electron-updater-channels';
import type { ElectronUpdatesAPI } from 'src/types/global';
import { I18N } from 'orgnote-api';
import { defineBoot } from '@quasar/app-vite/wrappers';
import { Platform } from 'quasar';
import { to } from 'orgnote-api/utils';
import { electronUpdateI18n } from 'src/constants/electron-update-i18n';
import { api } from './api';
import { i18n } from './i18n';
import { logger } from './logger';
import { reporter } from './report';
import {
  clearUpdateCheckNotification,
  showUpdateCheckNotification,
} from 'src/services/update-check-notifications';

const ELECTRON_UPDATE_NOTIFICATION_ID = 'electron-update-downloaded';

const translate = (key: string, values?: Record<string, unknown>): string => i18n.global.t(key, values ?? {});

const createUpdateDescription = (update: ElectronUpdateInfo): string => {
  if (!update.version) return translate(electronUpdateI18n.restartToInstall);
  return translate(electronUpdateI18n.versionReady, { version: update.version });
};

const reportInstallFailure = (cause?: unknown): void => {
  reporter.reportWarning(new Error(translate(electronUpdateI18n.installFailed), { cause }));
};

const installDownloadedUpdate = async (updates: ElectronUpdatesAPI): Promise<void> => {
  logger.info('Electron update install notification clicked');

  const result = await to(updates.installDownloadedUpdate)();
  if (result.isErr()) {
    logger.warn('Electron update install IPC failed', { error: result.error });
    reportInstallFailure(result.error);
    return;
  }

  if (result.value) {
    logger.info('Electron update install requested');
    return;
  }

  logger.warn('Electron update install request was rejected');
  reportInstallFailure();
};

const notifyDownloadedUpdate = (updates: ElectronUpdatesAPI, update: ElectronUpdateInfo): void => {
  clearUpdateCheckNotification(api);
  api.core.useNotifications().notify({
    id: ELECTRON_UPDATE_NOTIFICATION_ID,
    message: translate(electronUpdateI18n.ready),
    description: createUpdateDescription(update),
    level: 'info',
    timeout: 0,
    stored: true,
    icon: 'sym_o_system_update',
    onClick: () => {
      void installDownloadedUpdate(updates);
    },
  });
};

const reportUpdateError = (status: Extract<ElectronUpdateStatus, { type: 'error' }>): void => {
  if (status.isBackground) {
    logger.warn('Background Electron update check failed', { message: status.message });
    return;
  }

  clearUpdateCheckNotification(api);
  reporter.reportWarning(new Error(translate(electronUpdateI18n.failed, { message: status.message })));
};

const handleManualUpdateStatus = (status: ElectronUpdateStatus): void => {
  if (status.isBackground) return;
  if (status.type === 'checking') {
    showUpdateCheckNotification(api, { message: I18N.CHECKING_FOR_UPDATES, persistent: true });
    return;
  }
  if (status.type === 'available') {
    showUpdateCheckNotification(api, {
      message: I18N.UPDATE_AVAILABLE,
      description: I18N.UPDATE_DOWNLOAD_IN_PROGRESS,
      persistent: true,
    });
    return;
  }
  if (status.type === 'not-available') {
    showUpdateCheckNotification(api, { message: I18N.NO_UPDATES_AVAILABLE });
  }
};

const handleUpdateStatus = (updates: ElectronUpdatesAPI, status: ElectronUpdateStatus): void => {
  handleManualUpdateStatus(status);
  if (status.type === 'downloaded') {
    notifyDownloadedUpdate(updates, status);
    return;
  }

  if (status.type === 'installing') {
    logger.info('Electron update installer is starting');
    return;
  }

  if (status.type === 'error') {
    reportUpdateError(status);
  }
};

const requestUpdateCheck = async (updates: ElectronUpdatesAPI): Promise<void> => {
  const result = await to(updates.checkForUpdates)({ isBackground: true });
  if (result.isErr()) {
    logger.warn('Failed to request Electron update check', { error: result.error });
  }
};

export default defineBoot(() => {
  const updates = window.electron?.updates;
  if (!Platform.is.electron || !updates) return;

  updates.onStatus((status) => handleUpdateStatus(updates, status));
  void requestUpdateCheck(updates);
});
