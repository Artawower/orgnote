import { expect, test } from 'vitest';
import type { DbMigrations } from './migrator';
import { migrator } from './migrator';

// Mock type for testing
interface MockDatabase {
  data: Record<string, unknown>;
}

test('should create migrations with indexes and upgrades', () => {
  const migration = migrator<MockDatabase>();

  migration.v(1).indexes('++id,name');
  const migrations = migration
    .v(2)
    .indexes('++id,createdAt')
    .upgrade((db: MockDatabase) => {
      db.data.upgraded = true;
    })
    .build();

  expect(migrations).toEqual<DbMigrations<MockDatabase>>({
    1: {
      indexes: '++id,name',
    },
    2: {
      indexes: '++id,createdAt',
      migrate: expect.any(Function),
    },
  });
});

test('should throw an error if indexes or upgrade are called before version', () => {
  const migration = migrator<MockDatabase>();

  expect(() =>
    migration
      .v(1)
      .indexes('++id,name')
      .upgrade((db: MockDatabase) => {
        db.data.upgraded = true;
      })
      .v(0)
      .indexes('++id,name')
      .upgrade((db: MockDatabase) => {
        db.data.upgraded = true;
      }),
  ).toThrow(`Version 0 is out of order. Migrations must be added in order.`);
});

test('should execute migrate function', async () => {
  const migration = migrator<MockDatabase>();

  migration.v(1).indexes('++id,name');
  const migrations = migration
    .v(2)
    .indexes('++id,name,createdAt')
    .upgrade(async (db: MockDatabase) => {
      db.data.upgraded = true;
    })
    .build();

  const mockDb: MockDatabase = { data: {} };
  if (migrations[2]?.migrate) {
    await migrations[2].migrate(mockDb);
  }

  expect(mockDb.data).toEqual({ upgraded: true });
});

test('should allow multiple versions with upgrades and indexes', () => {
  const migration = migrator<MockDatabase>();

  migration.v(1).indexes('++id,name');
  const migrations = migration
    .v(2)
    .upgrade((db: MockDatabase) => {
      db.data.upgraded = true;
    })
    .indexes('++id,updatedAt')
    .build();

  expect(migrations).toEqual<DbMigrations<MockDatabase>>({
    1: {
      indexes: '++id,name',
    },
    2: {
      indexes: '++id,updatedAt',
      migrate: expect.any(Function),
    },
  });
});

test('should throw an error if no migrations are defined and build is called', () => {
  const migration = migrator<MockDatabase>();

  expect(() => migration.v(1).build()).toThrow('All migrations must have a handler');
});
