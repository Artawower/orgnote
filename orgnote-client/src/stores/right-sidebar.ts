import { defineStore } from 'pinia';
import { ref } from 'vue';
import { type RightSidebarStore } from 'orgnote-api';
import { usePanelState } from 'src/composables/use-panel-state';
import {
  RIGHT_SIDEBAR_MIN_WIDTH,
  RIGHT_SIDEBAR_MAX_WIDTH,
  RIGHT_SIDEBAR_DEFAULT_WIDTH,
} from 'src/constants/right-sidebar';

export const useRightSidebarStore = defineStore<'rightSidebar', RightSidebarStore>(
  'rightSidebar',
  () => {
    const panel = usePanelState();

    const width = ref(RIGHT_SIDEBAR_DEFAULT_WIDTH);

    const setWidth = (w: number) => {
      if (Number.isNaN(w)) return;
      width.value = Math.max(RIGHT_SIDEBAR_MIN_WIDTH, Math.min(w, RIGHT_SIDEBAR_MAX_WIDTH));
    };

    const navMenuOpen = ref(false);
    const openNavMenu = () => { navMenuOpen.value = true; };
    const closeNavMenu = () => { navMenuOpen.value = false; };
    const toggleNavMenu = () => { navMenuOpen.value = !navMenuOpen.value; };

    const store: RightSidebarStore = {
      ...panel,
      width,
      setWidth,
      navMenuOpen,
      openNavMenu,
      closeNavMenu,
      toggleNavMenu,
    };

    return store;
  },
);
