import type { ExtractPropTypes } from 'vue';
import type { StoreDefinition } from './store';
import type { VueComponent } from './vue-component';
import type { Sidebar } from './panel';

export type ComponentConfig<T extends VueComponent> = {
  componentProps?: ExtractPropTypes<T>;
};

export interface SidebarStore extends Sidebar {
  toggle: (cmp?: VueComponent) => void;
}

export type SidebarStoreDefinition = StoreDefinition<SidebarStore>;
