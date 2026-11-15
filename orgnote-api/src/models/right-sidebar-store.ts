import type { Ref } from 'vue';
import type { StoreDefinition } from './store';
import type { Sidebar } from './panel';

export interface RightSidebarStore extends Sidebar {
  width: Ref<number>;
  setWidth: (width: number) => void;
}

export type RightSidebarStoreDefinition = StoreDefinition<RightSidebarStore>;
