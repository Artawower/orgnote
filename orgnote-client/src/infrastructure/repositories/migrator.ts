export interface DbMigration<TModel = unknown> {
  indexes: string;
  migrate?: (db: TModel) => Promise<void> | void;
}

export interface DbMigrations<TModel = unknown> {
  [version: string]: DbMigration<TModel>;
}

export class IncorrectMigrationOrderError extends Error {
  constructor(version: number) {
    super(`Version ${version} is out of order. Migrations must be added in order.`);
  }
}

export class MigrationMustHaveIndexes {}

export function migrator<TModel = unknown>() {
  const migrations: DbMigrations<TModel> = {};
  let lastVersion: number | undefined;

  const v = (version: number) => {
    if (lastVersion && lastVersion >= version) {
      throw new IncorrectMigrationOrderError(version);
    }
    lastVersion = version;
    migrations[lastVersion!] = { indexes: '' };
    return { indexes, upgrade, build };
  };

  const indexes = (indexString: string) => {
    migrations[lastVersion!]!.indexes = indexString;
    return { v, upgrade, build };
  };

  const upgrade = (migrateFn: (db: TModel) => Promise<void> | void) => {
    migrations[lastVersion!]!.migrate = migrateFn;
    return { v, indexes, build };
  };

  const build = (): DbMigrations<TModel> => {
    if (!allMigrationsHaveIndexes()) {
      throw new Error('All migrations must have a handler');
    }
    return migrations;
  };

  const allMigrationsHaveIndexes = () => {
    return Object.values(migrations).every((migration) => migration.indexes?.length);
  };

  return { v };
}
