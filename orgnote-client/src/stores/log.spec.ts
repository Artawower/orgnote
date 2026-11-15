import { test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLogStore } from './log';
import type { LogRecord } from 'orgnote-api';

const createMockLogRecord = (overrides?: Partial<LogRecord>): LogRecord => ({
  ts: new Date('2024-01-15T10:00:00.000Z'),
  level: 'error',
  message: 'Test error message',
  ...overrides,
});

beforeEach(() => {
  setActivePinia(createPinia());
});

test('useLogStore initializes with empty logs', () => {
  const store = useLogStore();
  expect(store.logs).toEqual([]);
  expect(store.getLogsByLevel('error')).toEqual([]);
  expect(store.getCountByLevel('error')).toBe(0);
});

test('useLogStore addLog adds log to beginning of array', () => {
  const store = useLogStore();
  const log1 = createMockLogRecord({ message: 'First error' });
  const log2 = createMockLogRecord({ message: 'Second error' });

  store.addLog(log1);
  store.addLog(log2);

  expect(store.logs).toHaveLength(2);
  expect(store.logs[0]?.message).toBe('Second error');
  expect(store.logs[1]?.message).toBe('First error');
});

test('useLogStore addLog aggregates identical consecutive logs', () => {
  const store = useLogStore();
  const base = createMockLogRecord({ message: 'Duplicate error' });

  store.addLog(base);
  store.addLog({ ...base });
  store.addLog({ ...base, level: 'warn' });

  expect(store.logs).toHaveLength(2);
  expect(store.logs[1]?.message).toBe('Duplicate error');
  expect(store.logs[1]?.repeatCount).toBe(2);
});

test('useLogStore aggregates logs separated by other levels when within window', () => {
  const store = useLogStore();
  const errorLog = createMockLogRecord({ message: 'Error', level: 'error' });
  const infoLog = createMockLogRecord({ message: 'Info', level: 'info' });

  store.addLog(errorLog);
  store.addLog(infoLog);
  store.addLog({ ...errorLog, ts: new Date(errorLog.ts.getTime() + 10_000) });

  expect(store.logs).toHaveLength(2);
  const aggregated = store.logs.find((log) => log.level === 'error');
  expect(aggregated?.repeatCount).toBe(2);
});
test('useLogStore addLog respects MAX_LOGS limit', () => {
  const store = useLogStore();

  for (let i = 0; i < 505; i++) {
    store.addLog(createMockLogRecord({ message: `Error ${i}` }));
  }

  expect(store.logs).toHaveLength(500);
  expect(store.logs[0]?.message).toBe('Error 504');
  expect(store.logs[499]?.message).toBe('Error 5');
});

test('useLogStore addLogs adds multiple logs', () => {
  const store = useLogStore();
  const logs = [
    createMockLogRecord({ message: 'Error 1' }),
    createMockLogRecord({ message: 'Error 2' }),
    createMockLogRecord({ message: 'Error 3' }),
  ];

  store.addLogs(logs);

  expect(store.logs).toHaveLength(3);
  expect(store.logs[0]?.message).toBe('Error 1');
});

test('useLogStore addLogs respects MAX_LOGS limit', () => {
  const store = useLogStore();
  const logs = Array.from({ length: 505 }, (_, i) => createMockLogRecord({ message: `Error ${i}` }));

  store.addLogs(logs);

  expect(store.logs).toHaveLength(500);
});

test('useLogStore addLogs aggregates duplicates during initialization', () => {
  const store = useLogStore();
  store.addLogs([
    createMockLogRecord({ message: 'Same', level: 'error', ts: new Date('2024-01-15T10:00:00.000Z') }),
    createMockLogRecord({ message: 'Same', level: 'error', ts: new Date('2024-01-15T10:00:10.000Z') }),
    createMockLogRecord({ message: 'Other', level: 'warn' }),
  ]);

  expect(store.logs).toHaveLength(2);
  expect(store.logs[0]?.message).toBe('Same');
  expect(store.logs[0]?.repeatCount).toBe(2);
});

test('useLogStore getLogsByLevel filters only error level', () => {
  const store = useLogStore();
  store.addLog(createMockLogRecord({ level: 'error', message: 'Error 1' }));
  store.addLog(createMockLogRecord({ level: 'warn', message: 'Warning 1' }));
  store.addLog(createMockLogRecord({ level: 'error', message: 'Error 2' }));
  store.addLog(createMockLogRecord({ level: 'info', message: 'Info 1' }));

  const errorLogs = store.getLogsByLevel('error');

  expect(errorLogs).toHaveLength(2);
  expect(errorLogs[0]?.message).toBe('Error 2');
  expect(errorLogs[1]?.message).toBe('Error 1');
});

test('useLogStore getLogsByLevel filters only warn level', () => {
  const store = useLogStore();
  store.addLog(createMockLogRecord({ level: 'warn', message: 'Warning 1' }));
  store.addLog(createMockLogRecord({ level: 'error', message: 'Error 1' }));
  store.addLog(createMockLogRecord({ level: 'warn', message: 'Warning 2' }));

  const warnLogs = store.getLogsByLevel('warn');

  expect(warnLogs).toHaveLength(2);
  expect(warnLogs[0]?.message).toBe('Warning 2');
  expect(warnLogs[1]?.message).toBe('Warning 1');
});

test('useLogStore getCountByLevel returns correct error count', () => {
  const store = useLogStore();
  store.addLog(createMockLogRecord({ level: 'error', message: 'Error 1' }));
  store.addLog(createMockLogRecord({ level: 'warn' }));
  store.addLog(createMockLogRecord({ level: 'error', message: 'Error 2' }));

  expect(store.getCountByLevel('error')).toBe(2);
});

test('useLogStore getCountByLevel returns correct warn count', () => {
  const store = useLogStore();
  store.addLog(createMockLogRecord({ level: 'warn', message: 'Warn 1' }));
  store.addLog(createMockLogRecord({ level: 'error' }));
  store.addLog(createMockLogRecord({ level: 'warn', message: 'Warn 2' }));

  expect(store.getCountByLevel('warn')).toBe(2);
});

test('useLogStore getLogsByLevel works with all levels', () => {
  const store = useLogStore();
  store.addLog(createMockLogRecord({ level: 'error', message: 'E1' }));
  store.addLog(createMockLogRecord({ level: 'warn', message: 'W1' }));
  store.addLog(createMockLogRecord({ level: 'info', message: 'I1' }));
  store.addLog(createMockLogRecord({ level: 'error', message: 'E2' }));

  const errorLogs = store.getLogsByLevel('error');
  const warnLogs = store.getLogsByLevel('warn');
  const infoLogs = store.getLogsByLevel('info');

  expect(errorLogs).toHaveLength(2);
  expect(warnLogs).toHaveLength(1);
  expect(infoLogs).toHaveLength(1);
});

test('useLogStore getLogsSince filters by timestamp using last occurrence', () => {
  const store = useLogStore();
  const cutoffDate = new Date('2024-01-15T12:00:00.000Z');

  const early = createMockLogRecord({ ts: new Date('2024-01-15T10:00:00.000Z'), message: 'Early' });
  const mid1 = createMockLogRecord({ ts: new Date('2024-01-15T13:00:00.000Z'), message: 'Mid' });
  const mid2 = createMockLogRecord({ ts: new Date('2024-01-15T13:00:10.000Z'), message: 'Mid' });

  store.addLogs([early, mid1, mid2]);

  const recentLogs = store.getLogsSince(cutoffDate);

  expect(recentLogs).toHaveLength(1);
  const aggregated = recentLogs[0]!;
  expect(aggregated.message).toBe('Mid');
  expect(aggregated.repeatCount).toBe(2);
  expect(new Date(aggregated.lastTs!).getUTCMinutes()).toBe(0);
  expect(new Date(aggregated.lastTs!).getUTCSeconds()).toBe(10);
});

test('useLogStore clearLogs removes all logs', () => {
  const store = useLogStore();
  store.addLog(createMockLogRecord({ message: 'A' }));
  store.addLog(createMockLogRecord({ message: 'B' }));

  expect(store.logs).toHaveLength(2);

  store.clearLogs();

  expect(store.logs).toEqual([]);
  expect(store.getCountByLevel('error')).toBe(0);
});

test('useLogStore clearLogsByLevel removes only specified level', () => {
  const store = useLogStore();
  store.addLog(createMockLogRecord({ level: 'error', message: 'Error 1' }));
  store.addLog(createMockLogRecord({ level: 'warn', message: 'Warning 1' }));
  store.addLog(createMockLogRecord({ level: 'error', message: 'Error 2' }));

  store.clearLogsByLevel('error');

  expect(store.logs).toHaveLength(1);
  expect(store.logs[0]?.level).toBe('warn');
});

test('useLogStore exportAsText returns empty string when no errors', () => {
  const store = useLogStore();
  store.addLog(createMockLogRecord({ level: 'warn' }));
  store.addLog(createMockLogRecord({ level: 'info' }));

  expect(store.exportAsText()).toBe('');
});

test('useLogStore exportAsText formats single error', () => {
  const store = useLogStore();
  const log = createMockLogRecord({
    ts: new Date('2024-01-15T10:30:00.000Z'),
    message: 'Test error',
    context: { stack: 'Error: Test\n  at file.ts:42' },
  });

  store.addLog(log);

  const result = store.exportAsText();

  expect(result).toContain('[1] 2024-01-15T10:30:00.000Z');
  expect(result).toContain('Test error');
  expect(result).toContain('Error: Test');
  expect(result).toContain('at file.ts:42');
});

test('useLogStore exportAsText formats multiple errors with separator', () => {
  const store = useLogStore();
  store.addLog(createMockLogRecord({ message: 'Error 1' }));
  store.addLog(createMockLogRecord({ message: 'Error 2' }));

  const result = store.exportAsText();

  expect(result).toContain('Error 1');
  expect(result).toContain('Error 2');
  expect(result).toContain('---');
});

test('useLogStore exportAsText includes context without stack', () => {
  const store = useLogStore();
  const log = createMockLogRecord({
    context: {
      stack: 'Error stack',
      userId: '123',
      action: 'delete',
    },
  });

  store.addLog(log);

  const result = store.exportAsText();

  expect(result).toContain('Context:');
  expect(result).toContain('userId');
  expect(result).toContain('123');
  expect(result).toContain('action');
  expect(result).toContain('delete');
  expect(result).not.toContain('"stack"');
});

test('useLogStore exportAsText omits empty context', () => {
  const store = useLogStore();
  const log = createMockLogRecord({
    context: { stack: 'Error stack' },
  });

  store.addLog(log);

  const result = store.exportAsText();

  expect(result).not.toContain('Context:');
});

test('useLogStore exportAsText formats object message as JSON', () => {
  const store = useLogStore();
  const log = createMockLogRecord({
    message: { error: 'test', code: 123 } as unknown as string,
  });

  store.addLog(log);

  const result = store.exportAsText();

  expect(result).toContain('error');
  expect(result).toContain('test');
  expect(result).toContain('code');
  expect(result).toContain('123');
});

test('useLogStore exportAsText formats Error object message', () => {
  const store = useLogStore();
  const error = new Error('Test error message');
  const log = createMockLogRecord({
    message: error as unknown as string,
  });

  store.addLog(log);

  const result = store.exportAsText();

  expect(result).toContain('Test error message');
});
