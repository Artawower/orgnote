import { beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useClientUpdateStore } from './client-update';
import { version as currentClientVersion } from '../../package.json';

const { mockSystemInfoClientUpdateVersionGet, mockSystemInfoClientUpdateLatestGet, mockReportWarning } = vi.hoisted(() => ({
  mockSystemInfoClientUpdateVersionGet: vi.fn(),
  mockSystemInfoClientUpdateLatestGet: vi.fn(),
  mockReportWarning: vi.fn(),
}));

const previousClientVersion = '0.1.0';
const cachedCurrentChangelog = {
  version: currentClientVersion,
  changeLog: 'cached changelog',
  url: 'https://example.com/cached-release',
  detectedAt: '2024-01-01T00:00:00.000Z',
};

const changelogResponse = (version = currentClientVersion) => ({
  data: {
    version,
    changeLog: 'feat: improved onboarding',
    url: 'https://example.com/release',
  },
});

vi.mock('src/boot/axios', () => ({
  sdk: {
    systemInfo: {
      systemInfoClientUpdateVersionGet: mockSystemInfoClientUpdateVersionGet,
      systemInfoClientUpdateLatestGet: mockSystemInfoClientUpdateLatestGet,
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportWarning: mockReportWarning,
  },
}));

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

test('syncUpdateChangelog initializes last seen on first launch', async () => {
  const store = useClientUpdateStore();

  await store.syncUpdateChangelog();

  expect(store.updateChangelog).toBeNull();
  expect(store.unreadUpdateChangelog).toBeNull();
  expect(store.lastSeenVersion).toBe(currentClientVersion);
  expect(mockSystemInfoClientUpdateVersionGet).not.toHaveBeenCalled();
});

test('syncUpdateChangelog does not fetch when last seen version matches current version', async () => {
  const store = useClientUpdateStore();
  store.lastSeenVersion = currentClientVersion;

  await store.syncUpdateChangelog();

  expect(mockSystemInfoClientUpdateVersionGet).not.toHaveBeenCalled();
});

test('syncUpdateChangelog stores unread changelog when client version changed', async () => {
  const store = useClientUpdateStore();
  store.lastSeenVersion = previousClientVersion;
  mockSystemInfoClientUpdateVersionGet.mockResolvedValue(changelogResponse());

  await store.syncUpdateChangelog();

  expect(mockSystemInfoClientUpdateVersionGet).toHaveBeenCalledWith(previousClientVersion);
  expect(store.lastSeenVersion).toBe(currentClientVersion);
  expect(store.updateChangelog).toMatchObject({ version: currentClientVersion, fromVersion: previousClientVersion });
  expect(store.unreadUpdateChangelog).toMatchObject({ version: currentClientVersion });
});

test('syncUpdateChangelog ignores changelog when server version does not match current version', async () => {
  const store = useClientUpdateStore();
  store.lastSeenVersion = previousClientVersion;
  mockSystemInfoClientUpdateVersionGet.mockResolvedValue(changelogResponse('9.9.9'));

  await store.syncUpdateChangelog();

  expect(store.lastSeenVersion).toBe(currentClientVersion);
  expect(store.updateChangelog).toBeNull();
  expect(store.unreadUpdateChangelog).toBeNull();
});

test('syncUpdateChangelog reports warning and advances last seen version on endpoint error', async () => {
  const store = useClientUpdateStore();
  store.lastSeenVersion = previousClientVersion;
  mockSystemInfoClientUpdateVersionGet.mockRejectedValue(new Error('network'));

  await store.syncUpdateChangelog();

  expect(mockReportWarning).toHaveBeenCalled();
  expect(store.lastSeenVersion).toBe(currentClientVersion);
  expect(store.updateChangelog).toBeNull();
});

test('loadLatestChangelog fetches from latest endpoint and stores value', async () => {
  const store = useClientUpdateStore();
  mockSystemInfoClientUpdateLatestGet.mockResolvedValue(changelogResponse('0.42.0'));

  const loaded = await store.loadLatestChangelog();

  expect(mockSystemInfoClientUpdateLatestGet).toHaveBeenCalled();
  expect(loaded).toMatchObject({ version: '0.42.0' });
  expect(store.updateChangelog).toMatchObject({ version: '0.42.0' });
  expect(store.unreadUpdateChangelog).toMatchObject({ version: '0.42.0' });
});

test('loadLatestChangelog falls back to stored changelog on latest endpoint error', async () => {
  const store = useClientUpdateStore();
  mockSystemInfoClientUpdateLatestGet.mockRejectedValue(new Error('network'));

  const loaded = await store.loadLatestChangelog();

  expect(mockReportWarning).toHaveBeenCalled();
  expect(loaded).toBeNull();
});

test('loadLatestChangelog ignores invalid payload', async () => {
  const store = useClientUpdateStore();
  mockSystemInfoClientUpdateLatestGet.mockResolvedValue({ data: { version: currentClientVersion } });

  const loaded = await store.loadLatestChangelog();

  expect(loaded).toBeNull();
  expect(store.updateChangelog).toBeNull();
});

test('loadLatestChangelog uses current version cache without network request', async () => {
  const store = useClientUpdateStore();
  store.latestChangelog = cachedCurrentChangelog;

  const loaded = await store.loadLatestChangelog();

  expect(loaded).toMatchObject({ changeLog: 'cached changelog' });
  expect(mockSystemInfoClientUpdateLatestGet).not.toHaveBeenCalled();
});

test('loadLatestChangelog force refresh bypasses the current version cache', async () => {
  const store = useClientUpdateStore();
  store.latestChangelog = cachedCurrentChangelog;
  mockSystemInfoClientUpdateLatestGet.mockResolvedValue(changelogResponse('0.42.0'));

  const loaded = await store.loadLatestChangelog({ forceRefresh: true });

  expect(mockSystemInfoClientUpdateLatestGet).toHaveBeenCalledOnce();
  expect(loaded).toMatchObject({ version: '0.42.0' });
});

test('loadLatestChangelog force refresh does not report stale cache as current', async () => {
  const store = useClientUpdateStore();
  store.latestChangelog = cachedCurrentChangelog;
  mockSystemInfoClientUpdateLatestGet.mockRejectedValue(new Error('network'));

  const loaded = await store.loadLatestChangelog({ forceRefresh: true });

  expect(loaded).toBeNull();
  expect(store.latestChangelog).not.toBeNull();
});

test('markChangelogAsRead keeps changelog readable and clears unread state', async () => {
  const store = useClientUpdateStore();
  mockSystemInfoClientUpdateLatestGet.mockResolvedValue(changelogResponse('0.42.0'));
  await store.loadLatestChangelog();

  expect(store.updateChangelog).toMatchObject({ version: '0.42.0' });
  expect(store.unreadUpdateChangelog).toMatchObject({ version: '0.42.0' });

  store.markChangelogAsRead();

  expect(store.updateChangelog).toMatchObject({ version: '0.42.0' });
  expect(store.unreadUpdateChangelog).toBeNull();
});
