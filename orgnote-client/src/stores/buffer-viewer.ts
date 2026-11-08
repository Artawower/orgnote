import {
  parseBufferUri,
  RouteNames,
  type BufferViewerStore,
  type BufferViewerEntry,
  type Pane,
  type Tab,
} from 'orgnote-api';
import { defineStore } from 'pinia';
import { defineAsyncComponent, shallowRef, type AsyncComponentLoader, type Component } from 'vue';
import type { RouteLocationRaw, RouteRecordNameGeneric } from 'vue-router';
import { extractPathFromRoute } from 'src/utils/extract-path-from-route';
import { usePaneStore } from './pane';
import { useConfigStore } from './config';
import { useLayoutStore } from './layout';
import { useBufferViewStateStore } from './buffer-view-state';
import { getAdjacentPaneId } from 'src/utils/layout-adjacency';

const getRouteNameForScheme = (scheme: string): string => {
  const mapping: Record<string, string> = {
    file: RouteNames.File,
    remote: RouteNames.Remote,
    memory: RouteNames.File,
    shared: RouteNames.File,
    embedded: RouteNames.Embedded,
    builtin: RouteNames.Builtin,
  };
  return mapping[scheme] ?? RouteNames.File;
};

interface BufferRouteLocation {
  name: RouteRecordNameGeneric;
  params: { path: string };
}

interface OpenBufferLocation {
  paneId: string;
  tabId: string;
}

const DEFAULT_PRIORITY = 10;
const ADJACENT_PANE_SPLIT_DIRECTION = 'right';
const CREATE_INITIAL_ADJACENT_TAB = false;

const sortByPriority = (a: BufferViewerEntry, b: BufferViewerEntry): number =>
  (b.meta.priority ?? DEFAULT_PRIORITY) - (a.meta.priority ?? DEFAULT_PRIORITY);

const findById = (viewers: BufferViewerEntry[], id: string): BufferViewerEntry | undefined =>
  viewers.find((v) => v.meta.id === id);

const normalizeViewerEntry = (entry: BufferViewerEntry): BufferViewerEntry => {
  if (typeof entry.component !== 'function') return entry;
  return {
    ...entry,
    component: defineAsyncComponent(entry.component as AsyncComponentLoader<Component>),
  };
};

const getExtensionCandidates = (path: string): string[] => {
  const fileName = path.split('/').pop() ?? '';
  const parts = fileName.split('.').slice(1);
  if (parts.length === 0) return [];
  return parts.map((_, index) => parts.slice(index).join('.'));
};

const prioritizeActive = <T extends { id: string }>(items: T[], activeId?: string): T[] => {
  const active = items.find((item) => item.id === activeId);
  return active ? [active, ...items.filter((item) => item.id !== activeId)] : items;
};

const tabMatchesUri = (tab: Tab, uri: string): boolean =>
  extractPathFromRoute(tab.router.currentRoute.value) === uri;

export const useBufferViewerStore = defineStore<string, BufferViewerStore>(
  'buffer-viewer',
  (): BufferViewerStore => {
    const viewers = shallowRef<BufferViewerEntry[]>([]);

    const pane = usePaneStore();
    const configStore = useConfigStore();
    const layoutStore = useLayoutStore();
    const viewStateStore = useBufferViewStateStore();

    const getPreferredViewerId = (path: string): string | undefined => {
      const preferredReaders = configStore.config.fileReaders?.preferredReaders;
      if (!preferredReaders) return undefined;

      return getExtensionCandidates(path)
        .map((extension) => preferredReaders[extension])
        .find((id) => !!id);
    };

    const findPreferredViewer = (
      matching: BufferViewerEntry[],
      path: string,
    ): BufferViewerEntry | undefined => {
      const preferredId = getPreferredViewerId(path);
      if (!preferredId) return undefined;
      return findById(matching, preferredId);
    };

    const register = (entry: BufferViewerEntry): void => {
      viewers.value = [...viewers.value, normalizeViewerEntry(entry)];
    };

    const unregister = (viewerId: string): void => {
      viewers.value = viewers.value.filter((v) => v.meta.id !== viewerId);
      viewStateStore.clearViewer(viewerId);
    };

    const getViewers = (path: string): BufferViewerEntry[] => {
      return viewers.value.filter((v) => new RegExp(v.pattern).test(path)).sort(sortByPriority);
    };

    const getViewer = (path: string): BufferViewerEntry | undefined => {
      const matching = getViewers(path);
      if (!matching.length) return undefined;
      return findPreferredViewer(matching, path) ?? matching[0];
    };

    const buildRouteLocation = (uri: string): BufferRouteLocation => {
      const { scheme, path } = parseBufferUri(uri);
      return {
        name: getRouteNameForScheme(scheme),
        params: { path },
      };
    };

    const createBufferTab = async (
      route: RouteLocationRaw,
      paneId = pane.activePaneId,
    ): Promise<boolean> => {
      if (!paneId) return false;
      const tab = await pane.addTab(paneId);
      if (!tab) return false;
      await pane.navigate(route, tab.paneId, tab.id);
      return true;
    };

    const orderedPanes = (): Pane[] =>
      prioritizeActive(
        Object.values(pane.panes).map((paneRef) => paneRef.value),
        pane.activePaneId,
      );

    const findOpenBuffer = (uri: string): OpenBufferLocation | undefined => {
      const match = orderedPanes()
        .flatMap((currentPane) =>
          prioritizeActive(Object.values(currentPane.tabs.value), currentPane.activeTabId).map(
            (tab) => ({ paneId: currentPane.id, tab }),
          ),
        )
        .find(({ tab }) => tabMatchesUri(tab, uri));
      if (!match) return;
      return { paneId: match.paneId, tabId: match.tab.id };
    };

    const focusOpenBuffer = (uri: string): boolean => {
      const location = findOpenBuffer(uri);
      if (!location) return false;
      const isAlreadyActive =
        pane.activePaneId === location.paneId && pane.activeTab?.id === location.tabId;
      if (!isAlreadyActive) pane.selectTab(location.paneId, location.tabId);
      return true;
    };

    const navigateToBuffer = async (route: BufferRouteLocation): Promise<void> => {
      if (pane.activeTab?.router) {
        await pane.navigate(route);
        return;
      }
      const opened = await createBufferTab(route);
      if (!opened) throw new Error('buffer-viewer.open: no active pane available');
    };

    const showOrOpen = async (uri: string): Promise<void> => {
      const canonicalUri = parseBufferUri(uri).raw;
      if (focusOpenBuffer(canonicalUri)) return;
      await navigateToBuffer(buildRouteLocation(uri));
    };

    const open = async (uri: string): Promise<void> => {
      if (configStore.config.ui.reuseExistingBuffers) {
        await showOrOpen(uri);
        return;
      }
      await navigateToBuffer(buildRouteLocation(uri));
    };

    const openInNewTab = async (uri: string): Promise<void> => {
      const opened = await createBufferTab(buildRouteLocation(uri));
      if (!opened) throw new Error('buffer-viewer.openInNewTab: no active pane available');
    };

    const resolveOrCreateAdjacentPaneId = async (): Promise<string | undefined> => {
      const adjacentPaneId = getAdjacentPaneId(layoutStore.layout, pane.activePaneId);
      if (adjacentPaneId) return adjacentPaneId;

      const activePaneId = pane.activePaneId;
      if (!layoutStore.layout || !activePaneId) return undefined;
      return layoutStore.splitPaneInLayout(
        activePaneId,
        ADJACENT_PANE_SPLIT_DIRECTION,
        CREATE_INITIAL_ADJACENT_TAB,
      );
    };

    const openInAdjacentPane = async (uri: string): Promise<void> => {
      const adjacentPaneId = await resolveOrCreateAdjacentPaneId();
      if (!adjacentPaneId) {
        await open(uri);
        return;
      }

      const opened = await createBufferTab(buildRouteLocation(uri), adjacentPaneId);
      if (!opened) {
        await open(uri);
        return;
      }

      pane.setActivePane(adjacentPaneId);
    };

    return {
      register,
      unregister,
      getViewers,
      getViewer,
      open,
      openInNewTab,
      openInAdjacentPane,
      showOrOpen,
    };
  },
);
