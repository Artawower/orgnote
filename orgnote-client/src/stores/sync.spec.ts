import { test, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { SyncPlan } from 'orgnote-api';

const mockEnqueuePlanOperations = vi.fn();
const mockIsPlanEmpty = vi.fn();
const mockRecoverState = vi.fn(async () => undefined);
const mockCreateSyncPlan = vi.fn();
const mockReportError = vi.fn();

let mockUserActive: string | undefined = 'pro';
let mockUserExists = true;
let mockUserAnonymous = false;
let mockIsSelfHosted = false;
let mockSyncType: string = 'api';
let mockApiUrl = '/v1';

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useAuth: vi.fn(() => ({
        get user() {
          return mockUserExists
            ? { active: mockUserActive, isAnonymous: mockUserAnonymous }
            : undefined;
        },
      })),
      useConfig: vi.fn(() => ({
        get config() {
          return {
            network: { apiUrl: mockApiUrl },
            synchronization: { type: mockSyncType },
          };
        },
      })),
    },
  },
}));

vi.mock('./server-environment', () => ({
  useServerEnvironmentStore: () => ({
    get isSelfHosted() {
      return mockIsSelfHosted;
    },
  }),
}));

vi.mock('src/infrastructure/sync', () => ({
  enqueuePlanOperations: mockEnqueuePlanOperations,
  isPlanEmpty: mockIsPlanEmpty,
}));

vi.mock('orgnote-api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  class InvalidSyncResponseError extends Error {
    details: unknown;

    constructor(message: string, details: unknown) {
      super(message);
      this.details = details;
    }
  }

  class InvalidSyncChangesResponseError extends InvalidSyncResponseError {
    constructor(details: unknown) {
      super('invalid sync changes response', details);
    }
  }

  class InvalidSyncFileResponseError extends InvalidSyncResponseError {
    constructor(details: unknown) {
      super('invalid sync file response', details);
    }
  }

  return {
    ...actual,
    recoverState: mockRecoverState,
    createSyncPlan: mockCreateSyncPlan,
    I18N: { SYNC_INVALID_API_RESPONSE: 'sync invalid API response' },
    InvalidSyncResponseError,
    InvalidSyncChangesResponseError,
    InvalidSyncFileResponseError,
  };
});

vi.mock('src/boot/i18n', () => ({
  i18n: {
    global: {
      t: (key: string) => `translated:${key}`,
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: { reportError: mockReportError },
}));

vi.mock('src/boot/axios', () => ({
  sdk: { sync: {} },
}));

vi.mock('./file-system-manager', () => ({
  useFileSystemManagerStore: vi.fn(() => ({
    currentFs: {},
  })),
}));

const createEmptyPlan = (): SyncPlan => ({
  toUpload: [],
  toDownload: [],
  toDeleteLocal: [],
  toDeleteRemote: [],
  unchangedPaths: [],
  serverTime: '2024-01-01T00:00:00Z',
});

const createNonEmptyPlan = (): SyncPlan => ({
  ...createEmptyPlan(),
  toUpload: [{ path: '/note.org', mtime: 1000, size: 100 }],
});

beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
  mockUserActive = 'pro';
  mockUserExists = true;
  mockUserAnonymous = false;
  mockIsSelfHosted = false;
  mockSyncType = 'api';
  mockApiUrl = '/v1';
});

test('sync does not create plan when user is not active', async () => {
  mockUserActive = undefined;
  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockRecoverState).not.toHaveBeenCalled();
  expect(mockEnqueuePlanOperations).not.toHaveBeenCalled();
});

test('sync blocks unauthenticated self-hosted users', async () => {
  mockUserExists = false;
  mockIsSelfHosted = true;
  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockRecoverState).not.toHaveBeenCalled();
});

test('sync creates a plan for an inactive self-hosted user', async () => {
  mockUserActive = undefined;
  mockIsSelfHosted = true;
  mockRecoverState.mockResolvedValueOnce(undefined);
  mockCreateSyncPlan.mockResolvedValueOnce(createNonEmptyPlan());
  mockIsPlanEmpty.mockReturnValueOnce(false);
  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockRecoverState).toHaveBeenCalled();
  expect(mockEnqueuePlanOperations).toHaveBeenCalled();
});

test('sync blocks anonymous self-hosted users', async () => {
  mockUserActive = undefined;
  mockUserAnonymous = true;
  mockIsSelfHosted = true;
  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockRecoverState).not.toHaveBeenCalled();
});

test('sync does not create plan when sync type is none', async () => {
  mockSyncType = 'none';
  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockRecoverState).not.toHaveBeenCalled();
  expect(mockEnqueuePlanOperations).not.toHaveBeenCalled();
});

test('sync does not create plan when user.active is empty string', async () => {
  mockUserActive = '';
  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockRecoverState).not.toHaveBeenCalled();
});

test('sync proceeds to plan creation when user is active and sync type is api', async () => {
  mockRecoverState.mockResolvedValueOnce(undefined);
  mockCreateSyncPlan.mockResolvedValueOnce(createNonEmptyPlan());
  mockIsPlanEmpty.mockReturnValueOnce(false);

  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockRecoverState).toHaveBeenCalled();
  expect(mockCreateSyncPlan).toHaveBeenCalledWith(
    expect.objectContaining({
      rootPath: '/',
      enableContentHashCheck: true,
    }),
  );
  expect(mockEnqueuePlanOperations).toHaveBeenCalled();
});

test('sync skips executePlan when plan is empty', async () => {
  mockRecoverState.mockResolvedValueOnce(undefined);
  mockCreateSyncPlan.mockResolvedValueOnce(createEmptyPlan());
  mockIsPlanEmpty.mockReturnValueOnce(true);

  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockEnqueuePlanOperations).not.toHaveBeenCalled();
});

test('sync stores plan in currentPlan before execution', async () => {
  const plan = createNonEmptyPlan();

  mockRecoverState.mockResolvedValueOnce(undefined);
  mockCreateSyncPlan.mockResolvedValueOnce(plan);
  mockIsPlanEmpty.mockReturnValueOnce(false);
  mockEnqueuePlanOperations.mockImplementation(() => undefined);

  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(store.currentPlan).toBeNull();
});

test('sync replans once when an operation invalidates a file watermark', async () => {
  mockRecoverState.mockResolvedValue(undefined);
  mockCreateSyncPlan
    .mockResolvedValueOnce(createNonEmptyPlan())
    .mockResolvedValueOnce(createEmptyPlan());
  mockIsPlanEmpty.mockReturnValueOnce(false).mockReturnValueOnce(true);

  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();
  store.stateData = {
    files: {
      '/deleted.org': {
        mtime: 100,
        size: 10,
        version: 8,
        status: 'synced',
        syncedAt: '2026-07-25T10:00:00Z',
      },
    },
  };
  mockEnqueuePlanOperations.mockImplementationOnce(async () => {
    store.stateData!.files['/deleted.org'] = {
      mtime: 100,
      size: 10,
      version: 8,
      status: 'pending',
    };
  });

  await store.sync();

  expect(mockCreateSyncPlan).toHaveBeenCalledTimes(2);
  expect(mockEnqueuePlanOperations).toHaveBeenCalledTimes(1);
});

test('sync reports error and returns null plan when recoverState fails', async () => {
  const error = new Error('state recovery failed');
  mockRecoverState.mockRejectedValueOnce(error);

  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockReportError).toHaveBeenCalledWith(error);
  expect(mockEnqueuePlanOperations).not.toHaveBeenCalled();
});

test('sync reports error and returns null plan when createSyncPlan fails', async () => {
  const error = new Error('plan creation failed');
  mockRecoverState.mockResolvedValueOnce(undefined);
  mockCreateSyncPlan.mockRejectedValueOnce(error);

  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();

  expect(mockReportError).toHaveBeenCalledWith(error);
  expect(mockEnqueuePlanOperations).not.toHaveBeenCalled();
});

test('sync reports invalid API response without pausing retries', async () => {
  const { InvalidSyncChangesResponseError } = await import('orgnote-api');
  const error = new InvalidSyncChangesResponseError({
    operation: 'syncChangesGet',
    reason: 'missing_data',
    responseKind: 'html',
    topLevelKeys: [],
    dataKeys: [],
  });
  mockRecoverState.mockResolvedValue(undefined);
  mockCreateSyncPlan.mockRejectedValue(error);

  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();
  await store.sync();

  expect(mockCreateSyncPlan).toHaveBeenCalledTimes(2);
  expect(mockReportError).toHaveBeenCalledWith(
    error,
    expect.objectContaining({
      id: 'sync-invalid-api-response',
      message: 'translated:sync invalid API response',
      stored: true,
    }),
  );
  expect(mockEnqueuePlanOperations).not.toHaveBeenCalled();
});

test('sync reports invalid file response and clears current plan', async () => {
  const { InvalidSyncFileResponseError } = await import('orgnote-api');
  const error = new InvalidSyncFileResponseError({
    operation: 'syncFilesGet',
    path: '/note.org',
    reason: 'missing_content_hash',
    responseKind: 'array-buffer',
  });
  const plan = createNonEmptyPlan();
  mockRecoverState.mockResolvedValue(undefined);
  mockCreateSyncPlan.mockResolvedValue(plan);
  mockIsPlanEmpty.mockReturnValue(false);
  mockEnqueuePlanOperations.mockRejectedValue(error);

  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.sync();
  await store.sync();

  expect(mockEnqueuePlanOperations).toHaveBeenCalledTimes(2);
  expect(store.currentPlan).toBeNull();
  expect(mockReportError).toHaveBeenCalledWith(
    error,
    expect.objectContaining({ id: 'sync-invalid-api-response', stored: true }),
  );
});

test('reset clears currentPlan', async () => {
  const { useSyncStore } = await import('./sync');
  const store = useSyncStore();

  await store.reset();

  expect(store.currentPlan).toBeNull();
});
