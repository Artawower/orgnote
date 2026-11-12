import type { RouteLocationNormalized } from 'vue-router';

const defaultTabTitle = 'Untitled';

export function generateTabTitle(route: RouteLocationNormalized): string {
  const generator = route.meta?.titleGenerator;
  if (typeof generator === 'function') {
    return generator(route);
  }

  return defaultTabTitle;
}
