import { afterEach, beforeEach, expect, test, vi } from 'vitest';

/* eslint-disable @typescript-eslint/consistent-type-imports */
type PerfTimerModule = typeof import('src/boot/perf-timer');

const makeEntry = (
  name: string,
  startTime = 0,
  duration = 0,
  entryType = 'mark',
): PerformanceEntry => ({ name, startTime, duration, entryType }) as unknown as PerformanceEntry;

const createPerformanceMock = (
  nowValues: readonly number[] = [],
  entries: {
    navigation?: readonly PerformanceNavigationTiming[];
    paint?: readonly PerformanceEntry[];
    resource?: readonly PerformanceResourceTiming[];
  } = {},
) => {
  const markEntries = new Map<string, PerformanceEntry>();
  const measureEntries: PerformanceEntry[] = [];
  let tick = 0;

  const now = vi.fn(() => {
    const value = nowValues[tick];
    tick++;
    return value ?? tick;
  });

  const mark = vi.fn((name: string) => {
    markEntries.set(name, makeEntry(name, 0, 0, 'mark'));
  });

  const measure = vi.fn((name: string) => {
    measureEntries.push(makeEntry(name, 0, 0, 'measure'));
  });

  const clearMarks = vi.fn((name?: string) => {
    if (!name) {
      markEntries.clear();
      return;
    }
    markEntries.delete(name);
  });

  const clearMeasures = vi.fn((name?: string) => {
    if (!name) {
      measureEntries.length = 0;
      return;
    }
    const idx = measureEntries.findIndex((e) => e.name === name);
    if (idx >= 0) measureEntries.splice(idx, 1);
  });

  const getEntriesByType = vi.fn((type: string): PerformanceEntryList => {
    if (type === 'mark') return [...markEntries.values()];
    if (type === 'measure') return [...measureEntries];
    if (type === 'navigation')
      return [...(entries.navigation ?? [])] as unknown as PerformanceEntryList;
    if (type === 'paint') return [...(entries.paint ?? [])];
    if (type === 'resource')
      return [...(entries.resource ?? [])] as unknown as PerformanceEntryList;
    return [];
  });

  return {
    performance: {
      now,
      mark,
      measure,
      clearMarks,
      clearMeasures,
      getEntriesByType,
    } as unknown as Performance,
    markEntries,
    measureEntries,
  };
};

class MockPerformanceObserver {
  static instances: MockPerformanceObserver[] = [];

  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  private readonly cb: PerformanceObserverCallback;

  constructor(cb: PerformanceObserverCallback) {
    this.cb = cb;
    MockPerformanceObserver.instances.push(this);
  }

  emit(entryNames: readonly string[]): void {
    const list = {
      getEntries: () => entryNames.map((name) => makeEntry(name, 0, 0, 'measure')),
    } as unknown as PerformanceObserverEntryList;
    this.cb(list, this as unknown as PerformanceObserver);
  }

  static reset(): void {
    MockPerformanceObserver.instances = [];
  }
}

const importPerfTimer = async (
  isClient: boolean,
  options: {
    performance?: Performance;
    observerCtor?: typeof PerformanceObserver;
  } = {},
): Promise<PerfTimerModule> => {
  vi.resetModules();
  vi.stubGlobal('window', isClient ? ({} as Window & typeof globalThis) : undefined);
  if (options.performance) vi.stubGlobal('performance', options.performance);
  if (options.observerCtor) vi.stubGlobal('PerformanceObserver', options.observerCtor);
  return import('src/boot/perf-timer');
};

beforeEach(() => {
  MockPerformanceObserver.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

test('perfTimer createPerfTimer returns no-op timer on server side', async () => {
  const perf = await importPerfTimer(false);
  const timer = perf.createPerfTimer('server');

  const result = await timer.measure('x', async () => 42);

  expect(result).toBe(42);
  expect(timer.end('x')).toBe(0);
  expect(timer.report().measurements).toEqual([]);
  expect(perf.setupPerformanceObserver()).toBeNull();
  expect(perf.getBrowserTimingReport()).toEqual({
    navigation: [],
    paint: [],
    resources: [],
  });
});

test('perfTimer start/end records measurement and bumps reportVersion', async () => {
  const mock = createPerformanceMock([10, 35]);
  const perf = await importPerfTimer(true, { performance: mock.performance });
  const timer = perf.createPerfTimer('scope-a');

  const before = perf.reportVersion.value;
  timer.start('task');
  const duration = timer.end('task');

  expect(duration).toBe(25);
  expect(perf.reportVersion.value).toBe(before + 1);
  const report = perf.getScopeReport('scope-a');
  expect(report.measurements).toHaveLength(1);
  expect(report.measurements[0]?.name).toBe('task');
  expect(report.measurements[0]?.duration).toBe(25);
});

test('perfTimer end without start returns zero and warns in DEV', async () => {
  process.env.DEV = true as unknown as boolean;
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const mock = createPerformanceMock();
  const perf = await importPerfTimer(true, { performance: mock.performance });
  const timer = perf.createPerfTimer('scope-a');
  const duration = timer.end('missing');

  expect(duration).toBe(0);
  expect(warn).toHaveBeenCalledTimes(1);
});

test('perfTimer concurrent start warns and overwrites pending measurement', async () => {
  process.env.DEV = true as unknown as boolean;
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const mock = createPerformanceMock([1, 100, 120]);
  const perf = await importPerfTimer(true, { performance: mock.performance });
  const timer = perf.createPerfTimer('scope-b');

  timer.start('sync');
  timer.start('sync');
  const duration = timer.end('sync');

  expect(duration).toBe(20);
  expect(warn).toHaveBeenCalledTimes(1);
  expect(perf.getScopeReport('scope-b').measurements[0]?.startTime).toBe(100);
});

test('perfTimer measure records both success and failure paths', async () => {
  const mock = createPerformanceMock([1, 3, 10, 18]);
  const perf = await importPerfTimer(true, { performance: mock.performance });
  const timer = perf.createPerfTimer('scope-c');
  const ok = await timer.measure('ok', async () => 'done');
  await expect(
    timer.measure('fail', async () => {
      throw new Error('boom');
    }),
  ).rejects.toThrow('boom');

  expect(ok).toBe('done');
  const names = perf.getScopeReport('scope-c').measurements.map((m) => m.name);
  expect(names).toEqual(['ok', 'fail']);
});

test('perfTimer enforces max measurements limit with fifo eviction', async () => {
  const mock = createPerformanceMock();
  const perf = await importPerfTimer(true, { performance: mock.performance });
  const timer = perf.createPerfTimer('cap');

  for (let i = 0; i < 501; i++) {
    const label = 'm' + i;
    timer.start(label);
    timer.end(label);
  }

  const report = perf.getFullReport();
  expect(report.measurements).toHaveLength(500);
  expect(report.measurements[0]?.name).toBe('m1');
  expect(report.measurements[499]?.name).toBe('m500');
});

test('perfTimer clearAllMeasurements clears state and bumps version', async () => {
  const mock = createPerformanceMock();
  mock.markEntries.set('external:mark', makeEntry('external:mark', 0, 0, 'mark'));
  mock.measureEntries.push(makeEntry('external:measure', 0, 0, 'measure'));
  const perf = await importPerfTimer(true, { performance: mock.performance });
  const timer = perf.createPerfTimer('scope-d');
  timer.start('pending');
  timer.end('done');
  const before = perf.reportVersion.value;
  perf.clearAllMeasurements();

  expect(perf.reportVersion.value).toBe(before + 1);
  expect(perf.getFullReport().measurements).toHaveLength(0);
  expect(timer.end('pending')).toBe(0);
});

test('perfTimer setupPerformanceObserver disconnects previous observer', async () => {
  const mock = createPerformanceMock();
  const perf = await importPerfTimer(true, {
    performance: mock.performance,
    observerCtor: MockPerformanceObserver as unknown as typeof PerformanceObserver,
  });
  perf.setupPerformanceObserver();
  perf.setupPerformanceObserver();
  const firstInstance = MockPerformanceObserver.instances[0];
  expect(firstInstance?.disconnect).toHaveBeenCalledTimes(1);
});

test('perfTimer observer forwards only matching orgnote measurements', async () => {
  const mock = createPerformanceMock([5, 15]);
  const perf = await importPerfTimer(true, {
    performance: mock.performance,
    observerCtor: MockPerformanceObserver as unknown as typeof PerformanceObserver,
  });
  const timer = perf.createPerfTimer('obs');
  timer.start('sync');
  timer.end('sync');
  const onMeasure = vi.fn();
  perf.setupPerformanceObserver(onMeasure);
  MockPerformanceObserver.instances[0]?.emit(['ignored:entry', 'orgnote:obs:sync']);
  expect(onMeasure).toHaveBeenCalledTimes(1);
  expect(onMeasure.mock.calls[0]?.[0]).toMatchObject({ scope: 'obs', name: 'sync' });
});

test('perfTimer disconnectObserver is safe when no active observer', async () => {
  const mock = createPerformanceMock();
  const perf = await importPerfTimer(true, { performance: mock.performance });
  expect(() => perf.disconnectObserver()).not.toThrow();
});

test('perfTimer exported singleton scopes match constants', async () => {
  const perf = await importPerfTimer(true, {
    performance: createPerformanceMock().performance,
  });
  expect(perf.bootTimer.scope).toBe('boot');
  expect(perf.extensionTimer.scope).toBe('ext');
  expect(perf.runtimeTimer.scope).toBe('runtime');
});

test('perfTimer getFullReport and getScopeReport return correct scoped data', async () => {
  const mock = createPerformanceMock([1, 10, 20, 30]);
  const perf = await importPerfTimer(true, { performance: mock.performance });
  const timerA = perf.createPerfTimer('a');
  const timerB = perf.createPerfTimer('b');
  timerA.start('x');
  timerA.end('x');
  timerB.start('y');
  timerB.end('y');
  const full = perf.getFullReport();
  const scopeA = perf.getScopeReport('a');
  const scopeB = perf.getScopeReport('b');
  expect(full.measurements).toHaveLength(2);
  expect(scopeA.measurements).toHaveLength(1);
  expect(scopeA.measurements[0]?.name).toBe('x');
  expect(scopeB.measurements).toHaveLength(1);
  expect(scopeB.measurements[0]?.name).toBe('y');
});

test('perfTimer recordEvent stores zero-duration event at provided time', async () => {
  const mock = createPerformanceMock([25]);
  const perf = await importPerfTimer(true, { performance: mock.performance });

  perf.recordEventAt('boot', 'html-inline-script', 7);
  perf.recordEvent('boot', 'app-mounted');

  expect(perf.getScopeReport('boot').measurements).toEqual([
    { name: 'html-inline-script', scope: 'boot', duration: 0, startTime: 7 },
    { name: 'app-mounted', scope: 'boot', duration: 0, startTime: 25 },
  ]);
});

test('perfTimer getBrowserTimingReport maps navigation paint and resources', async () => {
  const nav = {
    startTime: 0,
    type: 'navigate',
    workerStart: 0.5,
    domainLookupStart: 1,
    domainLookupEnd: 3,
    connectStart: 3,
    connectEnd: 8,
    requestStart: 8,
    responseStart: 18,
    responseEnd: 28,
    domInteractive: 30,
    domComplete: 50,
    domContentLoadedEventStart: 40,
    domContentLoadedEventEnd: 45,
    loadEventStart: 55,
    loadEventEnd: 60,
  } as unknown as PerformanceNavigationTiming;

  const paint = [makeEntry('first-paint', 12), makeEntry('first-contentful-paint', 20)];

  const resources = Array.from({ length: 22 }, (_, idx) => {
    const n = idx + 1;
    return {
      name: 'https://example.com/assets/file-' + n + '.js',
      initiatorType: n % 2 ? 'script' : 'fetch',
      transferSize: n === 22 ? 0 : n * 100,
      encodedBodySize: n * 90,
      decodedBodySize: n * 110,
      duration: n,
      startTime: n,
    } as unknown as PerformanceResourceTiming;
  });

  const mock = createPerformanceMock([], { navigation: [nav], paint, resource: resources });
  const perf = await importPerfTimer(true, { performance: mock.performance });
  const report = perf.getBrowserTimingReport();

  expect(report.navigation).toHaveLength(9);
  expect(report.paint).toHaveLength(2);
  expect(report.resources).toHaveLength(20);
  expect(report.resources[0]?.duration).toBe(22);
  expect(report.resources[0]?.type).toBe('Fetch (cached)');
  expect(report.resources[0]?.size).toBe(22 * 110);
});
