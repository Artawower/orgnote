import { defineStore } from 'pinia';
import { type SidebarStore, type VueComponent } from 'orgnote-api';
import { ref } from 'vue';
import { usePanelState } from 'src/composables/use-panel-state';
import { FileManagerRef } from 'src/containers/file-manager-ref';

export const useSidebarStore = defineStore<'sidebar', SidebarStore>('sidebar', () => {
  const panel = usePanelState();
  const navMenuOpen = ref(false);

  const toggle = (cmp?: VueComponent) => {
    panel.openComponent(cmp ?? panel.component.value ?? FileManagerRef);
  };

  const openNavMenu = () => { navMenuOpen.value = true; };
  const closeNavMenu = () => { navMenuOpen.value = false; };
  const toggleNavMenu = () => { navMenuOpen.value = !navMenuOpen.value; };

  const store: SidebarStore = {
    ...panel,
    toggle,
    navMenuOpen,
    openNavMenu,
    closeNavMenu,
    toggleNavMenu,
  };

  return store;
});
