import { parseBufferUri, type Tab } from 'orgnote-api';
import { extractPathFromRoute } from 'src/utils/extract-path-from-route';
import { computed, type ComputedRef } from 'vue';

export interface TabFileActionData {
  path: string;
  paths: string[];
  interactive: true;
}

export const resolveTabFileActionData = (tab: Tab): TabFileActionData | undefined => {
  const routeUri = extractPathFromRoute(tab.router.currentRoute.value);
  if (!routeUri) return;

  const parsedUri = parseBufferUri(routeUri);
  if (parsedUri.scheme !== 'file') return;

  return {
    path: parsedUri.path,
    paths: [parsedUri.path],
    interactive: true,
  };
};

export const useTabContextMenu = (
  tabs: ComputedRef<Tab[]>,
): ComputedRef<Record<string, TabFileActionData | undefined>> =>
  computed<Record<string, TabFileActionData | undefined>>(() =>
    tabs.value.reduce<Record<string, TabFileActionData | undefined>>((acc, tab) => {
      acc[tab.id] = resolveTabFileActionData(tab);
      return acc;
    }, {}),
  );
