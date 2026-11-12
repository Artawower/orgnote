import Dexie from 'dexie';
import type { DbMigrations } from './migrator';

interface CombinedMigrations {
  [version: string]: {
    schema: { [key: string]: string };
    migrate?: { [key: string]: (item: unknown) => void | Promise<void> };
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDatabase<T extends { storeName: string; migrations: DbMigrations<any> }[]>(
  repositories: T,
) {
  const db = new Dexie('orgnote');

  const getCombinedStoresSchema = (): CombinedMigrations => {
    const combinedMigrations: CombinedMigrations = {};

    repositories.forEach((repository) => {
      Object.entries(repository.migrations).forEach(([version, migration]) => {
        if (!combinedMigrations[version]) {
          combinedMigrations[version] = { schema: {}, migrate: {} };
        }

        combinedMigrations[version]!.schema[repository.storeName] = migration.indexes;
        if (migration.migrate) {
          combinedMigrations[version]!.migrate![repository.storeName] = migration.migrate;
        }
      });
    });

    return combinedMigrations;
  };

  const initSchema = (): void => {
    const migrations = getCombinedStoresSchema();
    Object.keys(migrations).forEach((version) => {
      const migration = migrations[version];
      if (!migration) return;

      db.version(+version)
        .stores(migration.schema)
        .upgrade((tx) => {
          const tableUpdateTasks = Object.keys(migration.migrate ?? {}).map(async (storeName) => {
            const updateFn = migration.migrate?.[storeName];
            if (!updateFn) return;
            return tx.table(storeName).toCollection().modify(updateFn);
          });
          return Promise.all(tableUpdateTasks);
        });
    });
  };

  const dropAll = async (): Promise<void> => {
    await db.delete();
  };

  initSchema();

  return {
    db,
    dropAll,
  };
}
