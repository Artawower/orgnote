import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

const {
  mockExecute,
  mockGetCommand,
  mockReplace,
  mockAppAddListener,
  mockListenerRemove,
  mockReporterReport,
  mockReporterReportError,
} = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockGetCommand: vi.fn(),
  mockReplace: vi.fn(),
  mockAppAddListener: vi.fn(),
  mockListenerRemove: vi.fn(),
  mockReporterReport: vi.fn(),
  mockReporterReportError: vi.fn(),
}));

const mockRouteQuery = ref<Record<string, string | undefined>>({});

vi.mock('vue-router', () => ({
  useRouter: () =>
    ({
      isReady: () => Promise.resolve(),
      replace: mockReplace,
    }) as unknown as Router,
  useRoute: () =>
    ({
      query: mockRouteQuery.value,
    }) as unknown as RouteLocationNormalizedLoaded,
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useCommands: () => ({
        execute: mockExecute,
        get: mockGetCommand,
      }),
    },
    utils: {
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    },
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: mockAppAddListener.mockResolvedValue({ remove: mockListenerRemove }),
  },
}));

vi.mock('src/utils/platform-specific', () => ({
  nativeMobileOnly: <T>(fn: () => T) => fn,
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    report: mockReporterReport,
    reportError: mockReporterReportError,
  },
}));

import { useUrlCommandHandler } from './use-url-command-handler';
import { withSetup } from '../../test/with-setup';

const flushPromises = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRouteQuery.value = {};
  mockExecute.mockResolvedValue(undefined);
  mockGetCommand.mockReturnValue({ command: 'any' });
  mockAppAddListener.mockResolvedValue({ remove: mockListenerRemove });
});

afterEach(() => {
  vi.clearAllMocks();
});

test('useUrlCommandHandler executes command from valid execute query parameter', async () => {
  mockRouteQuery.value = { execute: JSON.stringify({ command: 'test-command' }) };

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockExecute).toHaveBeenCalledWith('test-command', {});

  app.unmount();
});

test('useUrlCommandHandler fails fast on malformed URI encoded JSON', async () => {
  mockRouteQuery.value = { execute: '%E0%A4%A' };

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockExecute).not.toHaveBeenCalled();

  app.unmount();
});

test('useUrlCommandHandler fails fast on invalid JSON payload', async () => {
  mockRouteQuery.value = { execute: '{"command": "test", "data": { "invalid" }}' };

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockExecute).not.toHaveBeenCalled();
  expect(mockReporterReport).toHaveBeenCalled();

  app.unmount();
});

test('useUrlCommandHandler executes command regardless of hide property', async () => {
  mockGetCommand.mockReturnValue({ command: 'hidden', hide: () => true });
  mockRouteQuery.value = { execute: JSON.stringify({ command: 'hidden' }) };

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockExecute).toHaveBeenCalledWith('hidden', {});

  app.unmount();
});


test('useUrlCommandHandler clears execute parameter after successful command', async () => {
  mockRouteQuery.value = { execute: JSON.stringify({ command: 'test-command' }), other: 'param' };

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockReplace).toHaveBeenCalledWith({ query: { other: 'param' } });

  app.unmount();
});

test('useUrlCommandHandler does not execute command when execute parameter is missing', async () => {
  mockRouteQuery.value = { other: 'param' };

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockExecute).not.toHaveBeenCalled();

  app.unmount();
});

test('useUrlCommandHandler reports error for invalid JSON in execute parameter', async () => {
  mockRouteQuery.value = { execute: 'not-valid-json' };

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockExecute).not.toHaveBeenCalled();
  expect(mockReporterReport).toHaveBeenCalled();

  app.unmount();
});

test('useUrlCommandHandler reports error when command field is missing', async () => {
  mockRouteQuery.value = { execute: JSON.stringify({ data: { key: 'value' } }) };

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockExecute).not.toHaveBeenCalled();
  expect(mockReporterReport).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining('command') }),
    expect.anything(),
  );

  app.unmount();
});

test('useUrlCommandHandler does not clear parameter when command execution fails', async () => {
  mockExecute.mockRejectedValue(new Error('Command failed'));
  mockRouteQuery.value = { execute: JSON.stringify({ command: 'failing-command' }) };

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockReporterReportError).toHaveBeenCalled();

  app.unmount();
});

test('useUrlCommandHandler sets up deep link listener on mobile', async () => {
  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(mockAppAddListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));

  app.unmount();
});

test('useUrlCommandHandler removes deep link listener on unmount', async () => {
  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  app.unmount();

  await flushPromises();

  expect(mockListenerRemove).toHaveBeenCalled();
});

test('useUrlCommandHandler handles deep link with valid execute parameter', async () => {
  let capturedHandler: ((event: { url: string }) => Promise<void>) | undefined;
  mockAppAddListener.mockImplementation(
    (_event: string, handler: (event: { url: string }) => Promise<void>) => {
      capturedHandler = handler;
      return Promise.resolve({ remove: mockListenerRemove });
    },
  );

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  expect(capturedHandler).toBeDefined();

  const executePayload = JSON.stringify({ command: 'deep-link-command', data: { foo: 'bar' } });
  await capturedHandler!({ url: `orgnote://app?execute=${encodeURIComponent(executePayload)}` });

  expect(mockExecute).toHaveBeenCalledWith('deep-link-command', { foo: 'bar' });

  app.unmount();
});

test('useUrlCommandHandler ignores deep link with wrong scheme', async () => {
  let capturedHandler: ((event: { url: string }) => Promise<void>) | undefined;
  mockAppAddListener.mockImplementation(
    (_event: string, handler: (event: { url: string }) => Promise<void>) => {
      capturedHandler = handler;
      return Promise.resolve({ remove: mockListenerRemove });
    },
  );

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  const executePayload = JSON.stringify({ command: 'should-not-execute' });
  await capturedHandler!({
    url: `https://example.com?execute=${encodeURIComponent(executePayload)}`,
  });

  expect(mockExecute).not.toHaveBeenCalled();

  app.unmount();
});

test('useUrlCommandHandler ignores deep link without execute parameter', async () => {
  let capturedHandler: ((event: { url: string }) => Promise<void>) | undefined;
  mockAppAddListener.mockImplementation(
    (_event: string, handler: (event: { url: string }) => Promise<void>) => {
      capturedHandler = handler;
      return Promise.resolve({ remove: mockListenerRemove });
    },
  );

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  await capturedHandler!({ url: 'orgnote://app?other=param' });

  expect(mockExecute).not.toHaveBeenCalled();

  app.unmount();
});

test('useUrlCommandHandler handles deep link with fragment in URL', async () => {
  let capturedHandler: ((event: { url: string }) => Promise<void>) | undefined;
  mockAppAddListener.mockImplementation(
    (_event: string, handler: (event: { url: string }) => Promise<void>) => {
      capturedHandler = handler;
      return Promise.resolve({ remove: mockListenerRemove });
    },
  );

  const [, app] = withSetup(() => useUrlCommandHandler());

  await flushPromises();

  const executePayload = JSON.stringify({ command: 'fragment-test' });
  await capturedHandler!({
    url: `orgnote://app?execute=${encodeURIComponent(executePayload)}#some-fragment`,
  });

  expect(mockExecute).toHaveBeenCalledWith('fragment-test', {});

  app.unmount();
});
