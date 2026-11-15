import type { Ref, UnwrapNestedRefs } from 'vue';
import type { OrgNoteConfig } from './orgnote-config';
import type { StoreDefinition } from './store';

export interface ConfigStore {
  config: UnwrapNestedRefs<OrgNoteConfig>;
  configErrors: Ref<string[]>;
  sync: () => Promise<void>;
}

export type ConfigStoreDefinition = StoreDefinition<ConfigStore>;
