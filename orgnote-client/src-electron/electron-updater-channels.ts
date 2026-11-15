export const ELECTRON_UPDATE_CHANNELS = {
  checkForUpdates: 'electron-updater:check-for-updates',
  installDownloadedUpdate: 'electron-updater:install-downloaded-update',
  status: 'electron-updater:status',
} as const;

export interface ElectronUpdateCheckOptions {
  isBackground?: boolean;
}

export interface ElectronUpdateCheckResult {
  isAvailable: boolean;
}

export interface ElectronUpdateInfo {
  version?: string;
  releaseName?: string | null;
  releaseDate?: string;
}

export type ElectronUpdateStatus =
  | { type: 'checking'; isBackground?: boolean }
  | ({ type: 'available'; isBackground?: boolean } & ElectronUpdateInfo)
  | ({ type: 'not-available'; isBackground?: boolean } & ElectronUpdateInfo)
  | ({ type: 'download-progress'; percent: number; isBackground?: boolean })
  | ({ type: 'downloaded'; isBackground?: boolean } & ElectronUpdateInfo)
  | { type: 'installing'; isBackground?: boolean }
  | { type: 'error'; message: string; isBackground?: boolean };
