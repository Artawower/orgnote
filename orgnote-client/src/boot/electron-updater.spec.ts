import { beforeEach, expect, test, vi } from 'vitest';
import { I18N } from 'orgnote-api';
import type { ElectronUpdateStatus } from '../../src-electron/electron-updater-channels';
import electronUpdaterBoot from './electron-updater';

const mocks = vi.hoisted(() => ({
  statusCallback: undefined as ((status: ElectronUpdateStatus) => void) | undefined,
  checkForUpdates: vi.fn().mockResolvedValue({ isAvailable: false }),
  installDownloadedUpdate: vi.fn(),
  notify: vi.fn(),
  reportWarning: vi.fn(),
  showUpdateCheckNotification: vi.fn(),
  clearUpdateCheckNotification: vi.fn(),
}));

vi.mock('@quasar/app-vite/wrappers', () => ({
  defineBoot: (boot: unknown) => boot,
}));

vi.mock('quasar', () => ({
  Platform: { is: { electron: true } },
}));

vi.mock('./api', () => ({
  api: {
    core: {
      useNotifications: () => ({ notify: mocks.notify, delete: vi.fn() }),
    },
  },
}));

vi.mock('./i18n', () => ({
  i18n: { global: { t: (key: string) => key } },
}));

vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}));

vi.mock('./report', () => ({
  reporter: { reportWarning: mocks.reportWarning },
}));

vi.mock('src/services/update-check-notifications', () => ({
  showUpdateCheckNotification: mocks.showUpdateCheckNotification,
  clearUpdateCheckNotification: mocks.clearUpdateCheckNotification,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.statusCallback = undefined;
  window.electron = {
    updates: {
      checkForUpdates: mocks.checkForUpdates,
      installDownloadedUpdate: mocks.installDownloadedUpdate,
      onStatus: (callback: (status: ElectronUpdateStatus) => void) => {
        mocks.statusCallback = callback;
        return vi.fn();
      },
    },
  } as unknown as Window['electron'];
});

test('Electron updater reports interactive check progress and result', async () => {
  await (electronUpdaterBoot as () => Promise<void>)();

  mocks.statusCallback?.({ type: 'checking', isBackground: false });
  expect(mocks.showUpdateCheckNotification).toHaveBeenLastCalledWith(
    expect.anything(),
    { message: I18N.CHECKING_FOR_UPDATES, persistent: true },
  );

  mocks.statusCallback?.({ type: 'available', isBackground: false });
  expect(mocks.showUpdateCheckNotification).toHaveBeenLastCalledWith(
    expect.anything(),
    {
      message: I18N.UPDATE_AVAILABLE,
      description: I18N.UPDATE_DOWNLOAD_IN_PROGRESS,
      persistent: true,
    },
  );

  mocks.statusCallback?.({ type: 'not-available', isBackground: false });
  expect(mocks.showUpdateCheckNotification).toHaveBeenLastCalledWith(
    expect.anything(),
    { message: I18N.NO_UPDATES_AVAILABLE },
  );
});

test('Electron updater keeps scheduled checks silent', async () => {
  await (electronUpdaterBoot as () => Promise<void>)();

  mocks.statusCallback?.({ type: 'checking', isBackground: true });
  mocks.statusCallback?.({ type: 'not-available', isBackground: true });

  expect(mocks.showUpdateCheckNotification).not.toHaveBeenCalled();
});
