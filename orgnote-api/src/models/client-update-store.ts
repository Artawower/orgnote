import type { ComputedRef } from 'vue';
import type { StoreDefinition } from './store';
import type { ChangelogRecord } from './client-update';

export interface LoadLatestChangelogOptions {
  forceRefresh?: boolean;
}

export interface ClientUpdateStore {
  updateChangelog: ComputedRef<ChangelogRecord | null>;
  unreadUpdateChangelog: ComputedRef<ChangelogRecord | null>;
  syncUpdateChangelog: () => Promise<void>;
  loadLatestChangelog: (
    options?: LoadLatestChangelogOptions,
  ) => Promise<ChangelogRecord | null>;
  markChangelogAsRead: () => void;
}

export type ClientUpdateStoreDefinition = StoreDefinition<ClientUpdateStore>;
