import type Dexie from 'dexie';
import { to } from 'orgnote-api/utils';

type MethodKey<T> = Extract<keyof T, string>;

interface DexieRecoveryOptions<T extends object> {
  exclude?: readonly MethodKey<T>[];
}

const INDEXED_DB_CONNECTION_LOST_MESSAGES = [
  'Connection to Indexed Database server lost',
  'Database has been closed',
] as const;

const isIndexedDbConnectionLost = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error.name === 'DatabaseClosedError') return true;
  return INDEXED_DB_CONNECTION_LOST_MESSAGES.some((message) => error.message.includes(message));
};

const reopenDatabase = async (db: Dexie): Promise<void> => {
  db.close({ disableAutoOpen: false });
  await db.open();
};

export const runDexieOperation = async <T>(db: Dexie, operation: () => Promise<T>): Promise<T> => {
  const result = await to(operation)();
  if (result.isOk()) return result.value;
  if (!isIndexedDbConnectionLost(result.error)) throw result.error;

  await reopenDatabase(db);
  return await operation();
};

const shouldRecoverMethod = <T extends object>(
  property: string | symbol,
  value: unknown,
  excluded: ReadonlySet<MethodKey<T>>,
): value is (...args: never[]) => Promise<unknown> =>
  typeof property === 'string' &&
  typeof value === 'function' &&
  !excluded.has(property as MethodKey<T>);

export const withDexieRecovery = <T extends object>(
  db: Dexie,
  target: T,
  options: DexieRecoveryOptions<T> = {},
): T => {
  const excluded = new Set(options.exclude ?? []);

  return new Proxy(target, {
    get(source, property, receiver) {
      const value = Reflect.get(source, property, receiver) as unknown;
      if (!shouldRecoverMethod<T>(property, value, excluded)) return value;

      return (...args: never[]) =>
        runDexieOperation(db, () => value.apply(source, args) as Promise<unknown>);
    },
  });
};
