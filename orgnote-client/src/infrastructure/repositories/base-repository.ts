import type { DbMigrations } from './migrator';

export interface BaseRepository {
  migrations: DbMigrations<unknown>;
  storeName: string;
}
