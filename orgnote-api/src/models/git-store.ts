import { Ref, ShallowRef } from 'vue';
import { StoreDefinition } from './store';
import { GitProviderInfo, GitRepoConfig, GitRepoHandle } from './git';

export interface GitStore {
  providers: ShallowRef<Record<string, GitProviderInfo>>;
  currentProviderId: Ref<string>;

  registerProvider: (info: GitProviderInfo) => void;
  unregisterProvider: (id: string) => void;
  setProvider: (id: string) => void;

  openRepo: (config: GitRepoConfig) => Promise<GitRepoHandle>;
}

export type GitStoreDefinition = StoreDefinition<GitStore>;
