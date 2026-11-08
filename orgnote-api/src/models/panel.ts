import type { Ref, ShallowRef } from 'vue';
import type { VueComponent } from './vue-component';
import type { ComponentConfig } from './sidebar-store';

export interface Sidebar {
  opened: Ref<boolean>;
  component: ShallowRef<VueComponent | undefined>;
  componentConfig: ShallowRef<ComponentConfig<VueComponent> | undefined>;
  close: () => void;
  open: () => void;
  toggle: () => void;
  setComponent: <T extends VueComponent>(
    cmp: T,
    config?: ComponentConfig<T>
  ) => void;
  openComponent: <T extends VueComponent>(
    cmp: T,
    config?: ComponentConfig<T>
  ) => void;
  navMenuOpen: Ref<boolean>;
  openNavMenu: () => void;
  closeNavMenu: () => void;
  toggleNavMenu: () => void;
}
