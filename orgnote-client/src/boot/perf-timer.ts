import { to } from 'orgnote-api/utils';
import { type Ref, ref } from 'vue';
import { hasWindow } from 'src/utils/platform-specific';

export interface PerfMeasurement {
  readonly name: string;
  readonly scope: string;
  readonly duration: number;
  readonly startTime: number;
}

export interface PerfReport {
  readonly measurements: readonly PerfMeasurement[];
  readonly totalDuration: number;
  readonly generatedAt: Date;
}

export interface NavigationPhase {
  readonly name: string;
  readonly duration: number;
  readonly startTime: number;
}

export interface PaintEntry {
  readonly name: string;
  readonly startTime: number;
}

export interface ResourceEntry {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly duration: number;
  readonly startTime: number;
}

export interface BrowserTimingReport {
  readonly navigation: readonly NavigationPhase[];
  readonly paint: readonly PaintEntry[];
  readonly resources: readonly ResourceEntry[];
}

type PerfEntry = { startTime: number; scope: string; label: string };

const SCOPE_SEPARATOR = ':';
const MARK_START_SUFFIX = ':start';
const MARK_END_SUFFIX = ':end';
const NAMESPACE = 'orgnote';
const MAX_MEASUREMENTS = 500;

const pendingStarts = new Map<string, PerfEntry>();
const completedMeasurements: PerfMeasurement[] = [];
let activeObserver: PerformanceObserver | null = null;

export const reportVersion: Ref<number> = ref(0);

const buildKey = (scope: string, label: string): string => `${scope}${SCOPE_SEPARATOR}${label}`;

const buildMarkName = (key: string, suffix: string): string =>
  `${NAMESPACE}${SCOPE_SEPARATOR}${key}${suffix}`;

const buildMeasureName = (key: string): string => `${NAMESPACE}${SCOPE_SEPARATOR}${key}`;

const bumpVersion = (): void => {
  reportVersion.value++;
};

const buildReport = (measurements: readonly PerfMeasurement[]): PerfReport => ({
  measurements,
  totalDuration: measurements.reduce((sum, m) => sum + m.duration, 0),
  generatedAt: new Date(),
});

const recordMeasurement = (entry: PerfEntry, duration: number): void => {
  completedMeasurements.push({
    name: entry.label,
    scope: entry.scope,
    duration,
    startTime: entry.startTime,
  });

  if (completedMeasurements.length > MAX_MEASUREMENTS) {
    completedMeasurements.splice(0, completedMeasurements.length - MAX_MEASUREMENTS);
  }

  bumpVersion();
};

export const recordEventAt = (scope: string, label: string, startTime: number): void => {
  if (!hasWindow()) return;
  recordMeasurement({ scope, label, startTime }, 0);
};

export const recordEvent = (scope: string, label: string): void => {
  if (!hasWindow()) return;
  recordEventAt(scope, label, performance.now());
};

export interface ScopedTimer {
  readonly scope: string;
  start: (label: string) => void;
  end: (label: string) => number;
  measure: <T>(label: string, fn: () => T | Promise<T>) => Promise<T>;
  report: () => PerfReport;
}

const createNoOpTimer = (scope: string): ScopedTimer => ({
  scope,
  start: () => {},
  end: () => 0,
  measure: async <T>(_label: string, fn: () => T | Promise<T>) => fn(),
  report: () => ({
    measurements: [],
    totalDuration: 0,
    generatedAt: new Date(),
  }),
});

export const createPerfTimer = (scope: string): ScopedTimer => {
  if (!hasWindow()) return createNoOpTimer(scope);

  const scopedStart = (label: string): void => {
    const key = buildKey(scope, label);
    const startTime = performance.now();
    const startMark = buildMarkName(key, MARK_START_SUFFIX);

    if (pendingStarts.has(key) && process.env.DEV) {
      console.warn(
        `[perf-timer] Overwriting pending start for "${key}". Concurrent measurements with the same label are not supported.`,
      );
    }

    performance.mark(startMark);
    pendingStarts.set(key, { startTime, scope, label });
  };

  const scopedEnd = (label: string): number => {
    const key = buildKey(scope, label);
    const entry = pendingStarts.get(key);

    if (!entry) {
      if (process.env.DEV)
        console.warn(`[perf-timer] end() called without matching start() for "${key}"`);
      return 0;
    }

    const endTime = performance.now();
    const startMark = buildMarkName(key, MARK_START_SUFFIX);
    const endMark = buildMarkName(key, MARK_END_SUFFIX);
    const measureName = buildMeasureName(key);

    performance.mark(endMark);

    const measureResult = to(() => performance.measure(measureName, startMark, endMark))();

    if (measureResult.isErr()) {
      if (process.env.DEV)
        console.warn(`[perf-timer] measure failed for ${measureName}:`, measureResult.error);
    }

    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);

    pendingStarts.delete(key);
    const duration = endTime - entry.startTime;
    recordMeasurement(entry, duration);

    return duration;
  };

  const scopedMeasure = async <T>(label: string, fn: () => T | Promise<T>): Promise<T> => {
    scopedStart(label);

    const executeResult = await to(fn)();
    scopedEnd(label);

    if (executeResult.isErr()) {
      throw executeResult.error;
    }

    return executeResult.value;
  };

  const scopedReport = (): PerfReport =>
    buildReport(completedMeasurements.filter((m) => m.scope === scope));

  return {
    scope,
    start: scopedStart,
    end: scopedEnd,
    measure: scopedMeasure,
    report: scopedReport,
  };
};

const extractPhase = (
  nav: PerformanceNavigationTiming,
  name: string,
  start: keyof PerformanceNavigationTiming,
  end: keyof PerformanceNavigationTiming,
): NavigationPhase => ({
  name,
  startTime: Number(nav[start]),
  duration: Number(nav[end]) - Number(nav[start]),
});

const extractPoint = (
  nav: PerformanceNavigationTiming,
  name: string,
  time: keyof PerformanceNavigationTiming,
): NavigationPhase => ({
  name,
  startTime: Number(nav[time]),
  duration: 0,
});

const RESOURCE_TYPE_MAP: Record<string, string> = {
  script: 'JS',
  link: 'CSS',
  img: 'Image',
  xmlhttprequest: 'XHR',
  fetch: 'Fetch',
};

const MAX_RESOURCES = 20;

export const getBrowserTimingReport = (): BrowserTimingReport => {
  if (!hasWindow()) return { navigation: [], paint: [], resources: [] };

  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;

  const navigation: NavigationPhase[] = nav
    ? [
        ...(nav.workerStart > 0 ? [extractPoint(nav, 'Service Worker Start', 'workerStart')] : []),
        extractPoint(nav, `Navigation (${nav.type})`, 'startTime'),
        extractPhase(nav, 'DNS Lookup', 'domainLookupStart', 'domainLookupEnd'),
        extractPhase(nav, 'TCP/TLS', 'connectStart', 'connectEnd'),
        extractPhase(nav, 'Request', 'requestStart', 'responseStart'),
        extractPhase(nav, 'Download', 'responseStart', 'responseEnd'),
        extractPhase(nav, 'DOM Parse', 'domInteractive', 'domComplete'),
        extractPhase(
          nav,
          'DOMContentLoaded',
          'domContentLoadedEventStart',
          'domContentLoadedEventEnd',
        ),
        extractPhase(nav, 'Load Event', 'loadEventStart', 'loadEventEnd'),
      ]
    : [];

  const paint: PaintEntry[] = performance
    .getEntriesByType('paint')
    .map((e) => ({ name: e.name, startTime: e.startTime }));

  const resources: ResourceEntry[] = performance
    .getEntriesByType('resource')
    .map((e) => e as PerformanceResourceTiming)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, MAX_RESOURCES)
    .map((e) => {
      const isCached = e.transferSize === 0 && (e.decodedBodySize > 0 || e.duration > 0);
      const resourceType = RESOURCE_TYPE_MAP[e.initiatorType] ?? e.initiatorType;
      return {
        name: e.name.split('/').pop() || e.name,
        type: isCached ? `${resourceType} (cached)` : resourceType,
        size: e.decodedBodySize || e.encodedBodySize || e.transferSize,
        duration: e.duration,
        startTime: e.startTime,
      };
    });

  return { navigation, paint, resources };
};

export const getFullReport = (): PerfReport => buildReport([...completedMeasurements]);

export const getScopeReport = (scope: string): PerfReport =>
  buildReport(completedMeasurements.filter((m) => m.scope === scope));

const clearNamespaceEntries = (type: 'mark' | 'measure'): void => {
  const clear =
    type === 'mark'
      ? (name: string) => performance.clearMarks(name)
      : (name: string) => performance.clearMeasures(name);
  performance
    .getEntriesByType(type)
    .filter((entry) => entry.name.startsWith(NAMESPACE))
    .forEach((entry) => clear(entry.name));
};

export const clearAllMeasurements = (): void => {
  completedMeasurements.length = 0;
  pendingStarts.clear();
  clearNamespaceEntries('mark');
  clearNamespaceEntries('measure');
  bumpVersion();
};

export const disconnectObserver = (): void => {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
};

export const BOOT_SCOPE = 'boot';
export const EXTENSION_SCOPE = 'ext';
export const RUNTIME_SCOPE = 'runtime';

export const bootTimer = createPerfTimer(BOOT_SCOPE);
export const extensionTimer = createPerfTimer(EXTENSION_SCOPE);
export const runtimeTimer = createPerfTimer(RUNTIME_SCOPE);

export const setupPerformanceObserver = (
  onMeasure?: (measurement: PerfMeasurement) => void,
): PerformanceObserver | null => {
  if (!hasWindow()) return null;

  disconnectObserver();

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (!entry.name.startsWith(NAMESPACE)) return;

      const found = completedMeasurements.find(
        (m) => entry.name === buildMeasureName(buildKey(m.scope, m.name)),
      );

      if (!found || !onMeasure) return;
      onMeasure(found);
    });
  });

  observer.observe({ type: 'measure', buffered: true });
  activeObserver = observer;
  return observer;
};
