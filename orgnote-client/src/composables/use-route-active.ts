import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { Router } from 'vue-router';

export function useRouteActive(customRouter?: Router) {
  const currentRoute = computed(() => customRouter?.currentRoute.value || useRoute());

  const isActive = (routeName: string) => currentRoute.value?.name === routeName;
  return { isActive };
}
