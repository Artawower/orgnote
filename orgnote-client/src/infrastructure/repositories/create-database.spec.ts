import 'fake-indexeddb/auto';
import { createDatabase } from './create-database';
import Dexie from 'dexie';
import { expect, test, beforeEach, afterEach } from 'vitest';

interface MockItem {
  id: number;
  name?: string;
  createdAt?: Date;
  updated?: boolean;
  migrated?: boolean;
}

const store1Repository = {
  storeName: 'store1',
  migrations: {
    '1': {
      indexes: '++id,name',
      migrate: (item: unknown) => {
        const mockItem = item as MockItem;
        mockItem.updated = true;
      },
    },
  },
};

const store2Repository = {
  storeName: 'store2',
  migrations: {
    '1': {
      indexes: '++id,createdAt',
    },
    '2': {
      indexes: '++id,updatedAt',
      migrate: (item: unknown) => {
        const mockItem = item as MockItem;
        mockItem.migrated = true;
      },
    },
  },
};

const mockRepositories = [store1Repository, store2Repository];

const DATABASE_NAME = 'orgnote';

let db: Dexie;

beforeEach(async () => {
  await Dexie.delete(DATABASE_NAME);
  const dbInstance = createDatabase(mockRepositories);
  db = dbInstance.db;
  await db.open();
});

afterEach(async () => {
  if (db && db.isOpen()) {
    await db.close();
  }
  await Dexie.delete(DATABASE_NAME);
});

beforeEach(async () => {
  await Dexie.delete(DATABASE_NAME);

  const dbInstance = createDatabase(mockRepositories);
  db = dbInstance.db;
  await db.open();
});

afterEach(async () => {
  if (db && db.isOpen()) {
    await db.close();
  }
  await Dexie.delete(DATABASE_NAME);
});

test('should initialize schema correctly', () => {
  expect(db.verno).toBe(2);

  const schema = db.tables.map((table) => table.name);
  expect(schema).toContain('store1');
  expect(schema).toContain('store2');
});

test('should handle migrations', async () => {
  const store1 = db.table<MockItem>('store1');
  await store1.add({ id: 1, name: 'Test Item' });

  await store1.toCollection().modify((item) => {
    const mockItem = item as MockItem;
    mockItem.updated = true;
  });

  const store2 = db.table<MockItem>('store2');
  await store2.add({ id: 2, createdAt: new Date() });

  await store2.toCollection().modify((item) => {
    const mockItem = item as MockItem;
    mockItem.migrated = true;
  });

  const store1Data = await store1.toArray();
  expect(store1Data[0]?.updated).toBe(true);

  const store2Data = await store2.toArray();
  expect(store2Data[0]?.migrated).toBe(true);
});

test('should drop all data', async () => {
  await db.table<MockItem>('store1').add({ id: 1, name: 'Test Item' });

  const { dropAll } = createDatabase(mockRepositories);
  await dropAll();

  const tables = await Dexie.getDatabaseNames();
  expect(tables).not.toContain(DATABASE_NAME);
});
