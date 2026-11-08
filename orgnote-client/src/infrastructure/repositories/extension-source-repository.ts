import type { ExtensionSource, ExtensionSourceRepository } from 'orgnote-api';
import type Dexie from 'dexie';
import { withDexieRecovery } from './dexie-retry';
import { migrator } from './migrator';

export const EXTENSION_SOURCE_REPOSITORY_NAME = 'extension-sources';

export const EXTENSION_SOURCE_MIGRATIONS = migrator<ExtensionSource>()
  .v(1)
  .indexes('++name, version, source')
  .build();

export function createExtensionSourceRepository(db: Dexie): ExtensionSourceRepository {
  const table = db.table<ExtensionSource>(EXTENSION_SOURCE_REPOSITORY_NAME);

  const get = async (extensionName: string): Promise<ExtensionSource | undefined> =>
    table.get(extensionName);

  const getBySource = async (source: string): Promise<ExtensionSource | undefined> =>
    table.where('source').equals(source).first();

  const getAll = async (): Promise<ExtensionSource[]> => table.toArray();

  const upsert = async (extension: ExtensionSource): Promise<void> => {
    await table.put(extension);
  };

  const upsertMany = async (extensions: ExtensionSource[]): Promise<void> => {
    await table.bulkPut(extensions);
  };

  const deleteExtension = async (extensionName: string): Promise<void> => {
    await table.delete(extensionName);
  };

  const deleteBySource = async (source: string): Promise<void> => {
    await table.where('source').equals(source).delete();
  };

  const clear = async (): Promise<void> => {
    await table.clear();
  };

  return withDexieRecovery(db, {
    get,
    getBySource,
    getAll,
    upsert,
    upsertMany,
    delete: deleteExtension,
    deleteBySource,
    clear,
  });
}
