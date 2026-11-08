import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import type { LogRecord, LoggerRepository } from 'orgnote-api';
import {
  submitLogRecord,
  initializeLogStore,
  connectLogRepository,
  resetDispatcherState,
  stopDispatcher,
} from './log-dispatcher';
import type { UseLogStore } from './log';
import { MAX_LOGS } from './log';

const createRecord = (overrides?: Partial<LogRecord>): LogRecord => ({
  ts: new Date(),
  level: 'info',
  message: 'test',
  ...overrides,
});

const createMockStore = (): UseLogStore => {
  let internalLogs: LogRecord[] = [];
  const store: Partial<UseLogStore> = {
    addLog: vi.fn((record: LogRecord) => {
      internalLogs = [record, ...internalLogs].slice(0, MAX_LOGS);
      store.logs = internalLogs;
    }),
    addLogs: vi.fn((entries: LogRecord[]) => {
      internalLogs = [...entries, ...internalLogs].slice(0, MAX_LOGS);
      store.logs = internalLogs;
    }),
    getLogsByLevel: vi.fn(() => []),
    getLogsSince: vi.fn(() => []),
    getCountByLevel: vi.fn(() => 0),
    clearLogs: vi.fn(),
    clearLogsByLevel: vi.fn(),
    exportAsText: vi.fn(() => ''),
  };
  store.logs = internalLogs;
  return store as UseLogStore;
};

const createMockRepository = (): LoggerRepository => ({
  add: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  query: vi.fn(async () => []),
  count: vi.fn(async () => 0),
  clear: vi.fn(async () => {}),
  purgeOlderThan: vi.fn(async () => {}),
});

beforeEach(() => {
  resetDispatcherState();
});

afterEach(() => {
  resetDispatcherState();
});

test('queues records until store is initialized', () => {
  const record = createRecord();
  submitLogRecord(record);
  const store = createMockStore();
  initializeLogStore(store, []);
  expect(store.addLog).toHaveBeenCalledWith(record);
});

test('initializeLogStore processes records queued during initialization', () => {
  const stagedRecord = createRecord({ message: 'staged' });
  submitLogRecord(stagedRecord);
  const store = createMockStore();
  const lateRecord = createRecord({ message: 'late' });

  (store.clearLogs as ReturnType<typeof vi.fn>).mockImplementation(() => {
    submitLogRecord(lateRecord);
  });

  initializeLogStore(store, []);

  expect(store.addLog).toHaveBeenCalledWith(stagedRecord);
  expect(store.addLog).toHaveBeenCalledWith(lateRecord);
});

test('initializeLogStore truncates stored records', () => {
  const store = createMockStore();
  const seed = Array.from({ length: MAX_LOGS + 5 }, (_, index) => createRecord({ message: `seed-${index}` }));
  initializeLogStore(store, seed);
  expect(store.logs).toHaveLength(MAX_LOGS);
});

test('connectLogRepository flushes queued records when batch threshold reached', async () => {
  const store = createMockStore();
  initializeLogStore(store, []);
  const repo = createMockRepository();
  await connectLogRepository(repo);
  for (let index = 0; index < 25; index += 1) {
    submitLogRecord(createRecord({ message: `queued-${index}` }));
  }
  await Promise.resolve();
  expect(repo.bulkAdd).toHaveBeenCalled();
});

test('stopDispatcher flushes remaining queue', async () => {
  const store = createMockStore();
  initializeLogStore(store, []);
  const repo = createMockRepository();
  await connectLogRepository(repo);
  submitLogRecord(createRecord());
  stopDispatcher();
  await Promise.resolve();
  expect(repo.bulkAdd).toHaveBeenCalled();
});
