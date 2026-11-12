import { beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
  apiUrl: '/v1',
  fetchSystemInfo: vi.fn(),
}));

vi.mock('./config', () => ({
  useConfigStore: () => ({
    config: {
      network: {
        get apiUrl() {
          return mocks.apiUrl;
        },
      },
    },
  }),
}));

vi.mock('src/boot/axios', () => ({
  sdk: {
    systemInfo: {
      systemInfoVersionGet: mocks.fetchSystemInfo,
    },
  },
}));

beforeEach(() => {
  setActivePinia(createPinia());
  mocks.apiUrl = '/v1';
  mocks.fetchSystemInfo.mockReset();
});

test('server environment detects and caches the current self-hosted server', async () => {
  mocks.fetchSystemInfo.mockResolvedValue({ data: { environment: { selfHosted: true } } });
  const { useServerEnvironmentStore } = await import('./server-environment');
  const store = useServerEnvironmentStore();

  await store.load();
  await store.load();

  expect(store.isSelfHosted).toBe(true);
  expect(mocks.fetchSystemInfo).toHaveBeenCalledTimes(1);
});

test('server environment fails closed and retries after detection errors', async () => {
  mocks.fetchSystemInfo
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ data: { environment: { selfHosted: true } } });
  const { useServerEnvironmentStore } = await import('./server-environment');
  const store = useServerEnvironmentStore();

  await store.load();
  expect(store.isSelfHosted).toBe(false);
  await store.load();

  expect(store.isSelfHosted).toBe(true);
  expect(mocks.fetchSystemInfo).toHaveBeenCalledTimes(2);
});

test('server environment discards stale responses from the previous server', async () => {
  let resolveFirst: ((value: unknown) => void) | undefined;
  let resolveSecond: ((value: unknown) => void) | undefined;
  mocks.fetchSystemInfo
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );
  const { useServerEnvironmentStore } = await import('./server-environment');
  const store = useServerEnvironmentStore();

  const firstLoad = store.load();
  mocks.apiUrl = 'https://server-b.example/v1';
  const secondLoad = store.load();
  resolveSecond?.({ data: { environment: { selfHosted: false } } });
  await secondLoad;
  resolveFirst?.({ data: { environment: { selfHosted: true } } });
  await firstLoad;

  expect(store.environment).toEqual({ selfHosted: false });
  expect(store.isSelfHosted).toBe(false);
});

test('server environment handles A to B to A while requests are pending', async () => {
  const resolvers: Array<(value: unknown) => void> = [];
  mocks.fetchSystemInfo.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolvers.push(resolve);
      }),
  );
  const { useServerEnvironmentStore } = await import('./server-environment');
  const store = useServerEnvironmentStore();

  const firstA = store.load();
  mocks.apiUrl = 'https://server-b.example/v1';
  const loadingB = store.load();
  mocks.apiUrl = '/v1';
  const secondA = store.load();
  resolvers[2]?.({ data: { environment: { selfHosted: true } } });
  await secondA;
  resolvers[0]?.({ data: { environment: { selfHosted: false } } });
  resolvers[1]?.({ data: { environment: { selfHosted: false } } });
  await Promise.all([firstA, loadingB]);

  expect(store.isSelfHosted).toBe(true);
  expect(mocks.fetchSystemInfo).toHaveBeenCalledTimes(3);
});
