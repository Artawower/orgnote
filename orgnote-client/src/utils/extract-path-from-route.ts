import { buildBufferUri, RouteNames, type BufferScheme } from 'orgnote-api';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

const ROUTE_SCHEME_MAPPING: Record<string, BufferScheme> = {
  [RouteNames.File]: 'file',
  [RouteNames.Remote]: 'remote',
  [RouteNames.Embedded]: 'embedded',
  [RouteNames.Builtin]: 'builtin',
};

const DEFAULT_SCHEME: BufferScheme = 'file';

const normalizePathParam = (path: string | string[]): string =>
  Array.isArray(path) ? path.join('/') : path;

const getSchemeFromRoute = (route: RouteLocationNormalizedLoaded): BufferScheme => {
  const routeName = route.name?.toString() ?? '';
  return ROUTE_SCHEME_MAPPING[routeName] ?? DEFAULT_SCHEME;
};

export const extractPathFromRoute = (route: RouteLocationNormalizedLoaded): string | undefined => {
  if (!route?.params?.path) return;

  const path = route.params.path;
  const normalized = normalizePathParam(path);

  if (normalized.length === 0) return;

  const scheme = getSchemeFromRoute(route);
  return buildBufferUri(scheme, normalized);
};
