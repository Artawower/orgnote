import type Dexie from 'dexie';
import type { LoggerRepository, LogRecord, LogFilter } from 'orgnote-api';
import { withDexieRecovery } from './dexie-retry';
import { migrator } from './migrator';

export const LOGGER_REPOSITORY_NAME = 'logs';

export const LOGGER_MIGRATIONS = migrator<LogRecord>()
  .v(1)
  .indexes('++id,ts,level,message')
  .build();

export const createLoggerRepository = (db: Dexie): LoggerRepository => {
  const store = db.table<LogRecord, number>(LOGGER_REPOSITORY_NAME);

  const normalizeRecord = (r: LogRecord): LogRecord => {
    const ts = r.ts ?? new Date();
    return {
      id: r.id,
      ts,
      level: r.level,
      message: r.message,
      bindings: r.bindings,
      context: r.context,
      repeatCount: r.repeatCount ?? 1,
      firstTs: r.firstTs ?? ts,
      lastTs: r.lastTs ?? ts,
    };
  };

  const add = async (record: LogRecord): Promise<void> => {
    const data = normalizeRecord(record);
    await store.add(data);
  };

  const bulkAdd = async (records: LogRecord[]): Promise<void> => {
    const data = records.map((r) => {
      const { id, ...withoutId } = normalizeRecord(r);
      void id;
      return withoutId;
    });
    await store.bulkAdd(data);
  };

  const applyFilter = (f: LogFilter) => {
    const text = f.text?.toLowerCase();
    const hasText = !!text && text.length > 0;

    const byLevel = (r: LogRecord) => (!f.level ? true : r.level === f.level);
    const byFrom = (r: LogRecord) => (!f.from ? true : r.ts >= f.from);
    const byTo = (r: LogRecord) => (!f.to ? true : r.ts <= f.to);
    const byText = (r: LogRecord) => (!hasText ? true : r.message.toLowerCase().includes(text!));

    return store.filter((r) => byLevel(r) && byFrom(r) && byTo(r) && byText(r));
  };

  const resolveTimestamp = (record: LogRecord): number => {
    const source = record.lastTs ?? record.ts;
    const date = source instanceof Date ? source : new Date(source);
    return date.getTime();
  };

  const query = async (filter: LogFilter): Promise<LogRecord[]> => {
    const limit = filter.limit;
    const offset = filter.offset ?? 0;

    const collection = applyFilter(filter).reverse().sortBy('ts');

    return collection.then((arr) => {
      const sorted = [...arr].sort(
        (left, right) => resolveTimestamp(right) - resolveTimestamp(left),
      );
      const start = offset < 0 ? 0 : offset;
      if (!limit || limit <= 0) return sorted.slice(start);
      return sorted.slice(start, start + limit);
    });
  };

  const count = async (filter?: Omit<LogFilter, 'limit' | 'offset'>): Promise<number> => {
    if (!filter) return store.count();
    return await applyFilter(filter).count();
  };

  const clear = (): Promise<void> => store.clear();

  const purgeOlderThan = async (date: Date): Promise<void> => {
    await store.where('ts').below(date).delete();
  };

  return withDexieRecovery(db, {
    add,
    bulkAdd,
    query,
    count,
    clear,
    purgeOlderThan,
  });
};
