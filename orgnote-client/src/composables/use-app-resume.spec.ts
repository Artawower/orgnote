import { vi, test, expect, beforeEach, afterEach } from 'vitest';
import { useAppResume, type UseAppResumeDeps } from './use-app-resume';

const createDeps = (overrides?: Partial<UseAppResumeDeps>): UseAppResumeDeps => ({
  setupWebResumeListener: vi.fn(() => vi.fn()),
  setupNativeResumeListener: vi.fn(() => Promise.resolve(undefined)),
  onError: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('useAppResume handles browser reconnect events', () => {
  const onResume = vi.fn();
  const stop = useAppResume(onResume);

  window.dispatchEvent(new Event('online'));

  expect(onResume).toHaveBeenCalledTimes(1);
  stop();
});

test('useAppResume calls onResume once when triggered multiple times within debounce window', async () => {
  const onResume = vi.fn();
  let capturedTrigger!: () => void;

  const deps = createDeps({
    setupWebResumeListener: vi.fn((trigger) => {
      capturedTrigger = trigger;
      return vi.fn();
    }),
  });

  useAppResume(onResume, deps);
  await Promise.resolve();

  capturedTrigger();
  capturedTrigger();
  capturedTrigger();

  expect(onResume).toHaveBeenCalledTimes(1);
});

test('useAppResume calls onResume again after debounce window passes', async () => {
  const onResume = vi.fn();
  let capturedTrigger!: () => void;

  const deps = createDeps({
    setupWebResumeListener: vi.fn((trigger) => {
      capturedTrigger = trigger;
      return vi.fn();
    }),
  });

  useAppResume(onResume, deps);
  await Promise.resolve();

  capturedTrigger();
  vi.advanceTimersByTime(400);
  capturedTrigger();

  expect(onResume).toHaveBeenCalledTimes(2);
});

test('useAppResume calls onError when onResume throws', async () => {
  const error = new Error('resume failed');
  const onResume = vi.fn().mockRejectedValue(error);
  let capturedTrigger!: () => void;

  const deps = createDeps({
    setupWebResumeListener: vi.fn((trigger) => {
      capturedTrigger = trigger;
      return vi.fn();
    }),
  });

  useAppResume(onResume, deps);
  capturedTrigger();

  await vi.runAllTimersAsync();

  expect(deps.onError).toHaveBeenCalled();
});

test('useAppResume calls web listener stop on cleanup', async () => {
  const stopWeb = vi.fn();
  const deps = createDeps({
    setupWebResumeListener: vi.fn(() => stopWeb),
  });

  const stop = useAppResume(vi.fn(), deps);
  await Promise.resolve();

  stop();

  expect(stopWeb).toHaveBeenCalled();
});

test('useAppResume calls native listener stop on cleanup', async () => {
  const stopNative = vi.fn();
  const deps = createDeps({
    setupNativeResumeListener: vi.fn(() => Promise.resolve(stopNative)),
  });

  const stop = useAppResume(vi.fn(), deps);
  await Promise.resolve();

  stop();

  expect(stopNative).toHaveBeenCalled();
});

test('useAppResume stops native listener if already resolved before stop called', async () => {
  const stopNative = vi.fn();
  let resolveNative!: (v: typeof stopNative) => void;

  const deps = createDeps({
    setupNativeResumeListener: vi.fn(
      () =>
        new Promise<typeof stopNative>((resolve) => {
          resolveNative = resolve;
        }),
    ),
  });

  const stop = useAppResume(vi.fn(), deps);
  stop();
  resolveNative(stopNative);

  await Promise.resolve();
  await Promise.resolve();

  expect(stopNative).toHaveBeenCalled();
});

test('useAppResume cancels debounce on cleanup', async () => {
  const onResume = vi.fn();
  let capturedTrigger!: () => void;

  const deps = createDeps({
    setupWebResumeListener: vi.fn((trigger) => {
      capturedTrigger = trigger;
      return vi.fn();
    }),
  });

  const stop = useAppResume(onResume, deps);
  await Promise.resolve();

  capturedTrigger();
  capturedTrigger();
  stop();

  vi.advanceTimersByTime(400);

  expect(onResume).toHaveBeenCalledTimes(1);
});

test('useAppResume passes same trigger to both web and native listeners', async () => {
  const webTriggers: (() => void)[] = [];
  const nativeTriggers: (() => void)[] = [];

  const deps = createDeps({
    setupWebResumeListener: vi.fn((trigger) => {
      webTriggers.push(trigger);
      return vi.fn();
    }),
    setupNativeResumeListener: vi.fn((trigger) => {
      nativeTriggers.push(trigger);
      return Promise.resolve(undefined);
    }),
  });

  useAppResume(vi.fn(), deps);
  await Promise.resolve();

  expect(webTriggers[0]).toBe(nativeTriggers[0]);
});
