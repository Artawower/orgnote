import { computed, watch, shallowRef, type ShallowRef, type ComputedRef } from 'vue';
import type { Router } from 'vue-router';
import { isPresent, to } from 'orgnote-api/utils';
import { api } from 'src/boot/api';

interface TabHistoryResult {
  canGoBack: ComputedRef<boolean>;
  canGoForward: ComputedRef<boolean>;
  handleNavigation: (direction: 'back' | 'forward') => void;
}

const isBackNavigation = (
  history: string[],
  index: number,
  fullPath: string,
): boolean => index > 0 && history[index - 1] === fullPath;

const isForwardNavigation = (
  history: string[],
  index: number,
  fullPath: string,
): boolean => index < history.length - 1 && history[index + 1] === fullPath;

const truncateAndAppend = (history: string[], index: number, fullPath: string): string[] =>
  history.slice(0, index + 1).concat(fullPath);

export const useTabHistory = (tabRouter: ShallowRef<Router | undefined>): TabHistoryResult => {
  const routeHistory = shallowRef<string[]>([]);
  const historyIndex = shallowRef(-1);

  const currentRoute = computed(() => tabRouter.value?.currentRoute.value);

  const initHistory = () => {
    const full = tabRouter.value?.currentRoute.value?.fullPath;
    if (!full) {
      routeHistory.value = [];
      historyIndex.value = -1;
      return;
    }
    routeHistory.value = [full];
    historyIndex.value = 0;
  };

  initHistory();
  watch(tabRouter, initHistory);

  watch(
    currentRoute,
    (newRoute, oldRoute) => {
      if (!newRoute || !oldRoute) return;
      if (newRoute.fullPath === oldRoute.fullPath) return;

      const hist = routeHistory.value;
      const idx = historyIndex.value;

      if (isBackNavigation(hist, idx, newRoute.fullPath)) {
        historyIndex.value = idx - 1;
        return;
      }
      if (isForwardNavigation(hist, idx, newRoute.fullPath)) {
        historyIndex.value = idx + 1;
        return;
      }

      routeHistory.value = truncateAndAppend(hist, idx, newRoute.fullPath);
      historyIndex.value = idx + 1;
    },
    { flush: 'sync' },
  );

  const canGoBack = computed(() => isPresent(tabRouter.value) && historyIndex.value > 0);

  const canGoForward = computed(
    () => isPresent(tabRouter.value) && historyIndex.value < routeHistory.value.length - 1,
  );

  const handleNavigation = (direction: 'back' | 'forward') => {
    const safeNavigate = to(() => {
      if (!tabRouter.value) {
        api.core.useNotifications().notify({
          message: 'Router not available',
          level: 'danger',
        });
        return;
      }

      if (direction === 'back') {
        if (!canGoBack.value) return;
        tabRouter.value.back();
        return;
      }
      if (!canGoForward.value) return;
      tabRouter.value.forward();
    });

    const result = safeNavigate();
    if (result.isErr()) {
      const errorMessage = result.error instanceof Error ? result.error.message : 'Unknown error';
      api.core.useNotifications().notify({
        message: `Navigation failed: ${errorMessage}`,
        level: 'danger',
      });
    }
  };

  return {
    canGoBack,
    canGoForward,
    handleNavigation,
  };
};
