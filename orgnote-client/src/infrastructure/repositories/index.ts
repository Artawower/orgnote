import type { Repositories } from 'orgnote-api';
import type Dexie from 'dexie';
import { createDatabase } from './create-database';
import {
  createLoggerRepository,
  LOGGER_MIGRATIONS,
  LOGGER_REPOSITORY_NAME,
} from './logger-repository';
import {
  createLayoutSnapshotRepository,
  PANE_SNAPSHOT_MIGRATIONS,
  PANE_SNAPSHOT_REPOSITORY_NAME,
} from './layout-snapshot-repository';
import { createQueueRepository, QUEUE_MIGRATIONS, QUEUE_REPOSITORY_NAME } from './queue-repository';
import {
  createExtensionSourceRepository,
  EXTENSION_SOURCE_MIGRATIONS,
  EXTENSION_SOURCE_REPOSITORY_NAME,
} from './extension-source-repository';
import {
  createKeyValueRepository,
  KEY_VALUE_MIGRATIONS,
  KEY_VALUE_REPOSITORY_NAME,
} from './key-value-repository';
import { createFileRepository, FILE_MIGRATIONS, FILE_REPOSITORY_NAME } from './file-repository';
import { BASE_CONTENT_MIGRATIONS, BASE_CONTENT_STORE_NAME } from '../stores/base-content-store';

let database: Dexie | undefined;

export const getDatabase = (): Dexie | undefined => database;

export async function initRepositories(): Promise<Repositories> {
  const { db } = createDatabase([
    { storeName: FILE_REPOSITORY_NAME, migrations: FILE_MIGRATIONS },
    { storeName: LOGGER_REPOSITORY_NAME, migrations: LOGGER_MIGRATIONS },
    { storeName: PANE_SNAPSHOT_REPOSITORY_NAME, migrations: PANE_SNAPSHOT_MIGRATIONS },
    { storeName: QUEUE_REPOSITORY_NAME, migrations: QUEUE_MIGRATIONS },
    { storeName: EXTENSION_SOURCE_REPOSITORY_NAME, migrations: EXTENSION_SOURCE_MIGRATIONS },
    { storeName: KEY_VALUE_REPOSITORY_NAME, migrations: KEY_VALUE_MIGRATIONS },
    { storeName: BASE_CONTENT_STORE_NAME, migrations: BASE_CONTENT_MIGRATIONS },
  ]);
  database = db;

  return {
    fileRepository: createFileRepository(db),
    logRepository: createLoggerRepository(db),
    layoutSnapshotRepository: createLayoutSnapshotRepository(db),
    queueRepository: createQueueRepository(db),
    extensionSourceRepository: createExtensionSourceRepository(db),
    keyValueRepository: createKeyValueRepository(db),
  };
}
