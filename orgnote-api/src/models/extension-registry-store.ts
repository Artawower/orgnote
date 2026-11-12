import type { Ref } from 'vue';
import type { ExtensionManifest } from './extension';
import type { StoreDefinition } from './store';

export interface ExtensionRegistryStore {
  availableExtensions: Ref<ExtensionManifest[]>;
  loading: Ref<boolean>;

  refresh: () => Promise<void>;
}

export type ExtensionRegistryStoreDefinition = StoreDefinition<ExtensionRegistryStore>;
