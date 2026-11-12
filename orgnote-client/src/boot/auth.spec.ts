import { beforeEach, expect, test, vi } from 'vitest';
import type { CapabilityUser } from 'src/utils/server-capabilities';

const useAutoSyncMock = vi.fn();
const useAppResumeMock = vi.fn();
const verifyUserMock = vi.fn();
const runPostActivationSyncMock = vi.fn();
const resumeSyncMock = vi.fn();
const reportWarningMock = vi.fn();
const loadServerEnvironmentMock = vi.fn();
const watchServerChangesMock = vi.fn();

let userBeforeVerify: CapabilityUser | null;
let userAfterVerify: CapabilityUser | null;
let hasVerifiedUser: boolean;
let mockIsSelfHosted: boolean;
let resumeHandler: (() => Promise<void>) | undefined;

const flushBackgroundTasks = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

vi.mock('@quasar/app-vite/wrappers', () => ({
  defineBoot: (bootFn: unknown) => bootFn,
}));

vi.mock('src/composables/use-auto-sync', () => ({
  useAutoSync: useAutoSyncMock,
}));

vi.mock('src/composables/use-app-resume', () => ({
  useAppResume: useAppResumeMock,
}));

vi.mock('src/composables/post-activation-sync', () => ({
  runPostActivationSync: runPostActivationSyncMock,
}));

vi.mock('src/stores/server-environment', () => ({
  useServerEnvironmentStore: () => ({
    get isSelfHosted() {
      return mockIsSelfHosted;
    },
    load: loadServerEnvironmentMock,
    watchServerChanges: watchServerChangesMock,
  }),
}));

vi.mock('./report', () => ({
  reporter: {
    reportWarning: reportWarningMock,
  },
}));

vi.mock('./api', () => ({
  api: {
    core: {
      useAuth: () => ({
        get user() {
          return hasVerifiedUser ? userAfterVerify : userBeforeVerify;
        },
        verifyUser: verifyUserMock,
      }),
      useSync: () => ({ sync: resumeSyncMock }),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  userBeforeVerify = null;
  userAfterVerify = null;
  hasVerifiedUser = false;
  mockIsSelfHosted = false;
  resumeHandler = undefined;

  vi.stubGlobal('navigator', { onLine: true });
  useAppResumeMock.mockImplementation((handler: () => Promise<void>) => {
    resumeHandler = handler;
  });
  loadServerEnvironmentMock.mockResolvedValue(undefined);
  verifyUserMock.mockImplementation(async () => {
    hasVerifiedUser = true;
  });
  runPostActivationSyncMock.mockResolvedValue(undefined);
  resumeSyncMock.mockResolvedValue(undefined);
});

test('does not block boot while user verification is pending', async () => {
  let resolveVerification: (() => void) | undefined;
  verifyUserMock.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resolveVerification = () => {
          hasVerifiedUser = true;
          resolve();
        };
      }),
  );
  const { default: bootAuth } = await import('./auth');

  const bootResult = bootAuth({} as never);

  expect(bootResult).toBeUndefined();
  expect(useAutoSyncMock).not.toHaveBeenCalled();
  resolveVerification?.();
  await flushBackgroundTasks();
  expect(useAutoSyncMock).toHaveBeenCalledTimes(1);
});

test('installs auto-sync while initial sync is pending', async () => {
  userBeforeVerify = { active: 'pro' };
  userAfterVerify = { active: 'pro' };
  let resolveSync: (() => void) | undefined;
  runPostActivationSyncMock.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resolveSync = resolve;
      }),
  );
  const { default: bootAuth } = await import('./auth');

  bootAuth({} as never);
  await vi.waitFor(() => expect(runPostActivationSyncMock).toHaveBeenCalledTimes(1));

  expect(useAutoSyncMock).toHaveBeenCalledTimes(1);
  resolveSync?.();
});

test('starts sync when verification establishes an eligible current user', async () => {
  userBeforeVerify = null;
  userAfterVerify = { active: 'pro' };
  const { default: bootAuth } = await import('./auth');

  bootAuth({} as never);
  await vi.waitFor(() => expect(runPostActivationSyncMock).toHaveBeenCalledTimes(1));

  expect(useAutoSyncMock).toHaveBeenCalledTimes(1);
});

test('starts sync for a persisted active hosted user after detection', async () => {
  userBeforeVerify = { active: 'pro' };
  userAfterVerify = { active: 'pro' };
  const { default: bootAuth } = await import('./auth');

  bootAuth({} as never);
  await vi.waitFor(() => expect(runPostActivationSyncMock).toHaveBeenCalledTimes(1));

  expect(verifyUserMock).toHaveBeenCalledTimes(1);
  expect(loadServerEnvironmentMock).toHaveBeenCalledTimes(1);
  expect(useAutoSyncMock).toHaveBeenCalledTimes(1);
  expect(watchServerChangesMock).toHaveBeenCalledTimes(1);
  expect(verifyUserMock.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
    loadServerEnvironmentMock.mock.invocationCallOrder[0] ?? 0,
  );
  expect(loadServerEnvironmentMock.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
    runPostActivationSyncMock.mock.invocationCallOrder[0] ?? 0,
  );
});

test('starts sync for a persisted inactive self-hosted user', async () => {
  userBeforeVerify = {};
  userAfterVerify = {};
  mockIsSelfHosted = true;
  const { default: bootAuth } = await import('./auth');

  bootAuth({} as never);
  await vi.waitFor(() => expect(runPostActivationSyncMock).toHaveBeenCalledTimes(1));

  expect(loadServerEnvironmentMock.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
    useAutoSyncMock.mock.invocationCallOrder[0] ?? 0,
  );
  expect(useAutoSyncMock.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
    runPostActivationSyncMock.mock.invocationCallOrder[0] ?? 0,
  );
});

test('does not sync a persisted inactive hosted user', async () => {
  userBeforeVerify = {};
  userAfterVerify = {};
  const { default: bootAuth } = await import('./auth');

  bootAuth({} as never);
  await flushBackgroundTasks();

  expect(runPostActivationSyncMock).not.toHaveBeenCalled();
});

test('does not sync a persisted anonymous self-hosted user', async () => {
  userBeforeVerify = { isAnonymous: true };
  userAfterVerify = { isAnonymous: true };
  mockIsSelfHosted = true;
  const { default: bootAuth } = await import('./auth');

  bootAuth({} as never);
  await flushBackgroundTasks();

  expect(runPostActivationSyncMock).not.toHaveBeenCalled();
});

test('retries detection and sync through the resume handler after offline startup', async () => {
  userBeforeVerify = {};
  userAfterVerify = {};
  vi.stubGlobal('navigator', { onLine: false });
  const { default: bootAuth } = await import('./auth');

  bootAuth({} as never);
  await flushBackgroundTasks();
  expect(runPostActivationSyncMock).not.toHaveBeenCalled();

  mockIsSelfHosted = true;
  vi.stubGlobal('navigator', { onLine: true });
  await resumeHandler?.();

  expect(loadServerEnvironmentMock).toHaveBeenCalledTimes(2);
  expect(resumeSyncMock).toHaveBeenCalledTimes(1);
});

test('installs auto-sync and reports verification errors', async () => {
  const startupError = new Error('Authentication failed');
  verifyUserMock.mockRejectedValue(startupError);
  const { default: bootAuth } = await import('./auth');

  bootAuth({} as never);
  await vi.waitFor(() => expect(reportWarningMock).toHaveBeenCalledWith(startupError));

  expect(useAutoSyncMock).toHaveBeenCalledTimes(1);
});
