import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  DefaultCommands,
  I18N,
  type Command,
  type OrgNoteApi,
  type PlatformHandler,
} from 'orgnote-api';
import { version as currentClientVersion } from '../../package.json';
import { getUpdateCommands } from './update-commands';

const mocks = vi.hoisted(() => ({
  loadLatestChangelog: vi.fn(),
  openExternalUrl: vi.fn(),
  showUpdateCheckNotification: vi.fn(),
}));

vi.mock('src/services/update-check-notifications', () => ({
  showUpdateCheckNotification: mocks.showUpdateCheckNotification,
}));

vi.mock('src/utils/open-external-url', () => ({
  openExternalUrl: mocks.openExternalUrl,
}));

const createApi = (platform: { electron?: boolean; nativeMobile?: boolean }) => {
  const is = { electron: false, nativeMobile: false, ...platform };
  const platformMatch = async <T>(handlers: PlatformHandler<T>): Promise<T> => {
    if (is.electron && handlers.electron) return handlers.electron();
    if (is.nativeMobile && handlers.nativeMobile) return handlers.nativeMobile();
    return handlers.default();
  };
  return {
    core: {
      useClientUpdate: () => ({ loadLatestChangelog: mocks.loadLatestChangelog }),
    },
    utils: { platform: { is }, platformMatch },
  } as unknown as OrgNoteApi;
};

const getCheckCommand = (): Command => {
  const command = getUpdateCommands().find(
    ({ command: name }) => name === DefaultCommands.CHECK_FOR_UPDATES,
  );
  if (!command) throw new Error('Check for updates command is not registered');
  return command;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete window.electron;
});

test('check for updates command starts an interactive Electron check', async () => {
  const checkForUpdates = vi.fn().mockResolvedValue({ isAvailable: false });
  window.electron = { updates: { checkForUpdates } } as unknown as Window['electron'];
  const api = createApi({ electron: true });

  await getCheckCommand().handler(api, undefined as never);

  expect(checkForUpdates).toHaveBeenCalledWith({ isBackground: false });
  expect(mocks.loadLatestChangelog).not.toHaveBeenCalled();
});

test('check for updates command reports the current mobile version', async () => {
  mocks.loadLatestChangelog.mockResolvedValue({
    version: currentClientVersion,
    url: 'https://example.com/current',
  });
  const api = createApi({ nativeMobile: true });

  await getCheckCommand().handler(api, undefined as never);

  expect(mocks.loadLatestChangelog).toHaveBeenCalledWith({ forceRefresh: true });
  expect(mocks.showUpdateCheckNotification).toHaveBeenLastCalledWith(api, {
    message: I18N.NO_UPDATES_AVAILABLE,
  });
});

test('check for updates command exposes a newer mobile release', async () => {
  mocks.loadLatestChangelog.mockResolvedValue({
    version: '99.0.0',
    url: 'https://example.com/release',
  });
  const api = createApi({ nativeMobile: true });

  await getCheckCommand().handler(api, undefined as never);

  const notification = mocks.showUpdateCheckNotification.mock.lastCall?.[1];
  expect(notification).toMatchObject({
    message: I18N.UPDATE_AVAILABLE,
    description: I18N.OPEN_UPDATE_PAGE,
    persistent: true,
  });
  notification?.onClick();
  expect(mocks.openExternalUrl).toHaveBeenCalledWith('https://example.com/release');
});

test('check for updates command is hidden outside Electron and native mobile', () => {
  const command = getCheckCommand();

  expect(command.hide?.(createApi({}))).toBe(true);
  expect(command.hide?.(createApi({ electron: true }))).toBe(false);
  expect(command.interactive).toBe(true);
});
