import type { Ref } from 'vue';
import type { StoreDefinition } from './store';

export interface OrgBabel {
  executor: (code: string) => Promise<string> | string;
  languages?: string[];
}

export interface BabelStore {
  orgBabels: Ref<Record<string, OrgBabel>>;
  register: (babel: OrgBabel) => void;
  unregister: (languages: string[]) => void;
  execute: (lang: string, code: string) => Promise<string>;
}

export type BabelStoreDefinition = StoreDefinition<BabelStore>;
