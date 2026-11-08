import 'vue-router';
import type { RouteLocationNormalized } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    titleGenerator?: (route: RouteLocationNormalized) => string;
  }
}
