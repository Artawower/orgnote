import { beforeEach, describe, expect, test, vi } from 'vitest';

const reportCriticalMock = vi.fn();
const reportWarningMock = vi.fn();
const eventListeners = new Map<string, EventListener>();

vi.mock('@quasar/app-vite/wrappers', () => ({
  defineBoot: (bootFn: unknown) => bootFn,
}));

vi.mock('./report', () => ({
  reporter: {
    reportCritical: reportCriticalMock,
    reportWarning: reportWarningMock,
  },
}));

vi.mock('src/utils/platform-specific', () => ({
  hasWindow: () => true,
}));

vi.mock('orgnote-api', () => ({
  RouteNames: {
    Error: 'Error',
  },
  isPresent: (value: unknown) => ![null, undefined].includes(value as null | undefined),
}));

const createRouter = () => ({
  push: vi.fn(() => Promise.resolve()),
  onError: vi.fn(),
});

const createUnhandledRejectionEvent = (reason: unknown): Event => {
  if ('PromiseRejectionEvent' in window) {
    return new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.reject(reason),
      reason,
    });
  }

  const event = new Event('unhandledrejection') as Event & { reason: unknown };
  Object.defineProperty(event, 'reason', { value: reason });
  return event;
};

const dispatchUnhandledRejection = (reason: unknown): void => {
  eventListeners.get('unhandledrejection')?.(createUnhandledRejectionEvent(reason));
};

const replaceReload = (): ReturnType<typeof vi.fn> => {
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    configurable: true,
  });
  return reload;
};

const setupBoot = async () => {
  const router = createRouter();
  const { default: bootErrorHandler } = await import('./error-handler');

  bootErrorHandler({ app: { config: {} }, router } as never);

  return router;
};

const createDatabaseClosedError = (message: string): Error => {
  const error = new Error(message);
  error.name = 'DatabaseClosedError';
  return error;
};

describe('error-handler boot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    eventListeners.clear();
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      eventListeners.set(type, listener as EventListener);
    });
  });

  test('opens error route when IndexedDB connection recovery failed before global handler', async () => {
    const reload = replaceReload();
    const router = await setupBoot();
    const indexedDbError = createDatabaseClosedError(
      'UnknownError Connection to Indexed Database server lost. Refresh the page to try again',
    );

    dispatchUnhandledRejection(indexedDbError);

    expect(reload).not.toHaveBeenCalled();
    expect(reportCriticalMock).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({ name: 'Error' });
  });

  test('opens error route when IndexedDB connection loss arrives as string rejection reason', async () => {
    const reload = replaceReload();
    const router = await setupBoot();

    dispatchUnhandledRejection(
      'UnknownError Connection to Indexed Database server lost. Refresh the page to try again',
    );

    expect(reload).not.toHaveBeenCalled();
    expect(reportCriticalMock).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({ name: 'Error' });
  });

  test('opens error route for ordinary unhandled rejections', async () => {
    const reload = replaceReload();
    const router = await setupBoot();

    dispatchUnhandledRejection(new Error('Ordinary failure'));

    expect(reload).not.toHaveBeenCalled();
    expect(reportCriticalMock).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({ name: 'Error' });
  });
});
