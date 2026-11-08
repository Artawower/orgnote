import type {
  ActiveBufferSnapshot,
  BufferActivatedEvent,
  BufferActivationCallback,
  BufferActivationSubscriptionOptions,
  BufferActivationUnsubscribe,
  InitialTabParams,
  Tab,
  Pane,
  PaneSnapshot,
  TabSnapshot,
  PaneStore,
} from 'orgnote-api';
import { RouteNames } from 'orgnote-api';
import { defineStore } from 'pinia';
import { getUniqueTabTitle } from 'src/utils/unique-tab-title';
import { v4 } from 'uuid';

import type { ShallowRef } from 'vue';
import { computed, shallowRef, ref, watch } from 'vue';
import type { RouteLocationRaw, Router } from 'vue-router';
import { createPaneRouter } from 'src/utils/pane-router';
import { useLayoutStore } from './layout';
import { isPresent, to } from 'orgnote-api/utils';
import { extractPathFromRoute } from 'src/utils/extract-path-from-route';
import { reporter } from 'src/boot/report';
import { generateTabTitle } from 'src/utils/generate-tab-title';
import { useBufferViewStateStore } from './buffer-view-state';

export const usePaneStore = defineStore<'panes', PaneStore>('panes', () => {
  // TODO: feat/stable-beta replace by reactive object
  const panes = shallowRef<Record<string, ShallowRef<Pane>>>({});
  const activePaneId = ref<string | undefined>();
  const bufferViewState = useBufferViewStateStore();

  const isDraggingTab = shallowRef(false);
  // TODO: feat/stable-beta separated drag&drop state
  const draggedTabData = shallowRef<{ tabId: string; paneId: string } | undefined>();

  const activePane = computed((): Pane | undefined => {
    const paneId = activePaneId.value;
    const pane = panes.value[paneId!];
    return pane?.value;
  });

  const activeTab = computed(() => {
    const pane = activePane.value;
    const tab = pane?.tabs.value[pane.activeTabId];
    return tab;
  });

  const activeRoute = computed(() => activeTab.value?.router.currentRoute.value);

  const activeBufferUri = computed(() => {
    const route = activeRoute.value;
    if (!route) return undefined;
    return extractPathFromRoute(route);
  });

  const activeBufferSnapshot = computed<ActiveBufferSnapshot>(() => ({
    paneId: activePaneId.value,
    tabId: activeTab.value?.id,
    uri: activeBufferUri.value,
  }));
  const bufferActivationCallbacks = new Set<BufferActivationCallback>();

  const notifyBufferActivationCallback = async (
    callback: BufferActivationCallback,
    event: BufferActivatedEvent,
  ): Promise<void> => {
    const result = await to(() => Promise.resolve(callback(event)))();
    if (result.isErr()) reporter.reportError(result.error);
  };

  const notifyBufferActivated = async (event: BufferActivatedEvent): Promise<void> => {
    await Promise.all(
      [...bufferActivationCallbacks].map((callback) =>
        notifyBufferActivationCallback(callback, event),
      ),
    );
  };

  const afterBufferActivated = (
    callback: BufferActivationCallback,
    options: BufferActivationSubscriptionOptions = {},
  ): BufferActivationUnsubscribe => {
    bufferActivationCallbacks.add(callback);
    if (options.immediate) {
      void notifyBufferActivationCallback(callback, { current: activeBufferSnapshot.value });
    }
    return () => {
      bufferActivationCallbacks.delete(callback);
    };
  };

  watch(
    activeBufferSnapshot,
    (current, previous) => {
      void notifyBufferActivated({ current, previous });
    },
    { flush: 'post' },
  );

  const activeTabTitle = computed((): string => {
    const tab = activeTab.value;
    if (!tab) return '';
    return generateTabTitle(tab.router.currentRoute.value) || tab.title;
  });

  const getAllTabTitles = computed((): string[] => {
    return Object.values(panes.value)
      .flatMap((pane) => Object.values(pane.value.tabs.value))
      .map((tab) => tab.title);
  });

  const hasMultiplePanes = computed(() => Object.keys(panes.value).length > 1);

  const createPane = async (params?: Partial<Pane>): Promise<Pane> => {
    const paneId = params?.id || v4();
    const tabs = getTabsForPane(params);
    const pane = shallowRef<Pane>({
      id: paneId,
      activeTabId: getActiveTabId(tabs) || '',
      tabs: shallowRef(tabs),
    });

    pushToPanes(pane);

    activePaneId.value = paneId;

    return pane.value;
  };

  const getPane = (id: string): ShallowRef<Pane> => {
    const pane = panes.value[id];
    if (!pane) {
      throw new Error(`Pane with id ${id} not found`);
    }
    return pane;
  };

  const setActivePane = (paneId: string): void => {
    if (!panes.value[paneId]) {
      throw new Error(`Pane with id ${paneId} not found`);
    }
    activePaneId.value = paneId;
  };

  const addTab = async (
    paneId: string,
    params: InitialTabParams = {},
  ): Promise<Tab | undefined> => {
    const pane = panes.value[paneId];
    if (!pane) return;

    const tab = await initNewTab({ ...params, paneId });

    pushToTabs(pane, tab);
    setTabAsActive(pane, tab.id);

    return tab;
  };

  const closeTab = async (paneId: string, tabId: string): Promise<boolean> => {
    const pane = panes.value[paneId];
    if (!pane?.value.tabs.value[tabId]) return false;

    const currentActiveTab = pane.value.tabs.value[pane.value.activeTabId];
    const isEmpty = closeTabInternal(paneId, tabId, currentActiveTab?.id);
    bufferViewState.clearTab(tabId);

    if (shouldRemoveEmptyPane(isEmpty)) {
      switchToFirstRemainingPane(paneId);
      closePane(paneId);
    }

    return isEmpty;
  };

  const selectTab = (paneId: string, tabId: string): void => {
    const pane = panes.value[paneId];
    if (!pane?.value.tabs.value[tabId]) return;

    pane.value = {
      ...pane.value,
      activeTabId: tabId,
    };

    activePaneId.value = paneId;
  };

  const moveTab = async (
    tabId: string,
    fromPaneId: string,
    toPaneId: string,
    index?: number,
  ): Promise<Tab | undefined> => {
    const fromPane = panes.value[fromPaneId];
    const toPane = panes.value[toPaneId];

    if (!fromPane?.value || !toPane?.value) return;

    const tab = getTabFromPane(fromPaneId, tabId);
    if (!tab) return;

    const movedTab = updateTabPaneId(tab, toPaneId);

    removeTabFromPane(fromPane, tabId);
    addTabToPane(toPane, movedTab, index);
    handleSourcePaneAfterMove(fromPane, fromPaneId, toPaneId, tabId, movedTab);

    activateTabInPane(toPaneId, movedTab.id);

    return movedTab;
  };

  const navigate = async (
    params: RouteLocationRaw,
    paneId?: string,
    tabId?: string,
  ): Promise<void> => {
    const targetPaneId = paneId ?? activePaneId.value;
    if (!targetPaneId) {
      throw new Error('No active pane');
    }

    const pane = panes.value[targetPaneId];
    if (!pane?.value) {
      throw new Error(`Pane ${targetPaneId} not found`);
    }

    const targetTabId = tabId ?? pane.value.activeTabId;
    const tab = pane.value.tabs.value[targetTabId];

    if (!tab?.router) {
      throw new Error(`Tab ${targetTabId} not found or has no router`);
    }

    const routeParams = buildRouteParams(params, targetTabId);
    await tab.router.push(routeParams);
  };

  const startDraggingTab = (tabId: string, paneId: string): void => {
    draggedTabData.value = { tabId, paneId };
    isDraggingTab.value = true;
  };

  const stopDraggingTab = (): void => {
    isDraggingTab.value = false;
    draggedTabData.value = undefined;
  };

  const getPanesData = (): PaneSnapshot[] => {
    const snapshots = Object.values(panes.value).map((paneRef) =>
      createPaneSnapshot(paneRef.value),
    );
    return snapshots.filter((s) => s.tabs.length > 0);
  };

  const isEmbeddedTab = (tab: Tab): boolean => {
    return tab.router.currentRoute.value.name === RouteNames.Embedded;
  };

  const restorePanesData = async (snapshot: PaneSnapshot[]): Promise<void> => {
    clearPanesState();

    for (const paneSnapshot of snapshot) {
      const pane = await restorePaneFromSnapshot(paneSnapshot);
      panes.value[paneSnapshot.id] = pane;
    }

    if (snapshot.length > 0 && snapshot[0]) {
      activePaneId.value = snapshot[0].id;
    } else {
      activePaneId.value = undefined;
    }
  };

  const initNewTab = async (
    params?: Partial<Pick<Tab, 'title' | 'id' | 'paneId'>>,
  ): Promise<Tab> => {
    const id = params?.id || v4();
    const router = await createPaneRouter(id);

    const title = params?.title || getUniqueTabTitle(getAllTabTitles.value);

    const newTab = {
      title,
      paneId: params?.paneId ?? '',
      router,
      id,
    };

    return newTab;
  };

  const closeTabInternal = (paneId: string, tabId: string, activeTabId?: string): boolean => {
    const pane = panes.value[paneId];
    if (!pane?.value.tabs.value[tabId]) return false;

    if (shouldPreventTabDeletion(pane)) {
      handleLastTabDeletion(pane, tabId);
      return false;
    }

    handleRegularTabDeletion(pane, tabId, activeTabId);

    const isEmpty = Object.keys(pane.value.tabs.value).length === 0;
    return isEmpty;
  };

  const switchToFirstRemainingPane = (paneId: string): void => {
    const remainingPanes = Object.keys(panes.value);
    if (remainingPanes.length === 0) return;

    const skipSwitch = activePaneId.value !== paneId;
    if (skipSwitch) {
      return;
    }

    const newActivePaneId = remainingPanes[0];
    if (!newActivePaneId) return;

    activePaneId.value = newActivePaneId;

    const newActivePane = panes.value[newActivePaneId];
    // TODO: feat/stable-beta function to ensure tab active?
    if (newActivePane && !newActivePane.value.activeTabId) {
      setFirstTabAsActive(newActivePane);
    }
  };

  const handleSourcePaneAfterMove = (
    fromPane: ShallowRef<Pane>,
    fromPaneId: string,
    toPaneId: string,
    tabId: string,
    movedTab: Tab,
  ): void => {
    const isEmpty = isPaneEmpty(fromPane);

    if (isEmpty) {
      handleEmptySourcePane(fromPane, fromPaneId, toPaneId, tabId, movedTab);
      return;
    }
    handleNonEmptySourcePane(fromPane, tabId);
  };

  const createPaneSnapshot = (pane: Pane): PaneSnapshot => {
    const tabSnapshots = Object.values(pane.tabs.value)
      .filter((tab) => !isEmbeddedTab(tab))
      .map(createTabSnapshot);

    const activeTabId = tabSnapshots.some((t) => t.id === pane.activeTabId)
      ? pane.activeTabId
      : tabSnapshots[0]?.id || '';

    return {
      id: pane.id,
      activeTabId,
      tabs: tabSnapshots,
    };
  };

  const restorePaneFromSnapshot = async (paneSnapshot: PaneSnapshot): Promise<ShallowRef<Pane>> => {
    const tabs: Record<string, Tab> = {};

    for (const tabSnapshot of paneSnapshot.tabs) {
      const tab = await restoreTabFromSnapshot(tabSnapshot);
      tabs[tab.id] = tab;
    }

    const activeTabId = tabs[paneSnapshot.activeTabId]
      ? paneSnapshot.activeTabId
      : (Object.keys(tabs)[0] ?? '');

    return shallowRef<Pane>({
      id: paneSnapshot.id,
      activeTabId,
      tabs: shallowRef(tabs),
    });
  };

  const shouldPreventTabDeletion = (pane: ShallowRef<Pane>): boolean => isOnlyTabInOnlyPane(pane);

  const shouldRemoveEmptyPane = (isEmpty: boolean): boolean => isEmpty && hasMultiplePanes.value;

  const handleLastTabDeletion = (pane: ShallowRef<Pane>, tabId: string): void => {
    const tab = pane.value.tabs.value[tabId];
    if (!tab) return;
    resetLastTabRoute(tab);
  };

  const handleRegularTabDeletion = (
    pane: ShallowRef<Pane>,
    tabId: string,
    activeTabId: string | undefined,
  ): void => {
    const tabKeys = Object.keys(pane.value.tabs.value);
    const tabIndex = tabKeys.indexOf(tabId);
    const isActiveTabDeleted = tabId === activeTabId;

    if (isActiveTabDeleted) {
      handleActiveTabDeletion(pane, tabKeys, tabIndex);
    }

    removeTabFromPane(pane, tabId);
  };

  const handleEmptySourcePane = (
    fromPane: ShallowRef<Pane>,
    fromPaneId: string,
    toPaneId: string,
    tabId: string,
    movedTab: Tab,
  ): void => {
    if (shouldActivateMovedTab(fromPane, tabId)) {
      activateTabInPane(toPaneId, movedTab.id);
    }

    removeSourcePaneIfNeeded(fromPaneId, toPaneId);
  };

  const handleNonEmptySourcePane = (fromPane: ShallowRef<Pane>, tabId: string): void => {
    const wasActiveTab = fromPane.value.activeTabId === tabId;
    if (wasActiveTab) {
      setFirstTabAsActive(fromPane);
    }
  };

  const setFirstTabAsActive = (pane: ShallowRef<Pane>): void => {
    const tabKeys = Object.keys(pane.value.tabs.value);
    if (tabKeys.length === 0) return;
    const firstTabId = tabKeys[0];
    if (!firstTabId) return;
    pane.value = {
      ...pane.value,
      activeTabId: firstTabId,
    };
  };

  const isPaneEmpty = (pane: ShallowRef<Pane>): boolean => {
    const tabCount = Object.keys(pane.value.tabs.value).length;
    return tabCount === 0;
  };

  const createTabSnapshot = (tab: Tab): TabSnapshot => ({
    id: tab.id,
    title: tab.title,
    paneId: tab.paneId,
    routeLocation: {
      path: tab.router.currentRoute.value.path,
      params: { ...tab.router.currentRoute.value.params } as Record<string, string>,
      query: { ...tab.router.currentRoute.value.query } as Record<string, string>,
      hash: tab.router.currentRoute.value.hash,
      name: tab.router.currentRoute.value.name?.toString(),
    },
  });

  const restoreTabFromSnapshot = async (tabSnapshot: TabSnapshot): Promise<Tab> => {
    const router = await createPaneRouter(tabSnapshot.id);
    await restoreRouterState(router, tabSnapshot.routeLocation);
    return {
      id: tabSnapshot.id,
      title: tabSnapshot.title,
      paneId: tabSnapshot.paneId,
      router,
    };
  };

  const isOnlyTabInOnlyPane = (pane: ShallowRef<Pane>): boolean => {
    const isLastTab = isLastTabInPane(pane);
    const isOnlyPane = !hasMultiplePanes.value;
    return isLastTab && isOnlyPane;
  };

  const resetLastTabRoute = (tab: Tab): void => {
    if (!tab?.router) return;
    tab.router.push({ name: RouteNames.InitialPage, params: { tabId: tab.id } });
  };

  const handleActiveTabDeletion = (
    pane: ShallowRef<Pane>,
    tabKeys: string[],
    tabIndex: number,
  ): void => {
    const nextActiveTabId = findNextActiveTab(tabKeys, tabIndex);
    if (!nextActiveTabId) return;
    updateActiveTab(pane, nextActiveTabId);
  };

  const shouldActivateMovedTab = (pane: ShallowRef<Pane>, tabId: string): boolean =>
    pane.value.activeTabId === tabId;

  const removeSourcePaneIfNeeded = (fromPaneId: string, toPaneId: string): void => {
    const shouldRemove = shouldRemovePane(fromPaneId);

    if (!shouldRemove) return;

    updateActivePaneIfNeeded(fromPaneId, toPaneId);
    closePane(fromPaneId);

    const layoutStore = useLayoutStore();
    layoutStore.removePaneFromLayout(fromPaneId);
  };

  const activateTabInPane = (paneId: string, tabId: string): void => {
    const pane = panes.value[paneId];
    if (!pane?.value) return;
    pane.value = {
      ...pane.value,
      activeTabId: tabId,
    };
    activePaneId.value = paneId;
  };

  const restoreRouterState = async (
    router: Router,
    routeLocation: TabSnapshot['routeLocation'],
  ): Promise<void> => {
    if (routeLocation.name && router.hasRoute(routeLocation.name)) {
      await router.push({
        name: routeLocation.name,
        params: routeLocation.params,
        query: routeLocation.query,
        hash: routeLocation.hash,
      });
      return;
    }
    if (!routeLocation.path) return;
    await router.push(routeLocation.path);
  };

  const isLastTabInPane = (pane: ShallowRef<Pane>): boolean => {
    return Object.keys(pane.value.tabs.value).length === 1;
  };

  const findNextActiveTab = (tabKeys: string[], deletedTabIndex: number): string | undefined => {
    const nextIndex =
      deletedTabIndex < tabKeys.length - 1 ? deletedTabIndex + 1 : deletedTabIndex - 1;
    return tabKeys[nextIndex];
  };

  const updateActiveTab = (pane: ShallowRef<Pane>, newActiveTabId: string): void => {
    pane.value = {
      ...pane.value,
      activeTabId: newActiveTabId,
    };
  };

  const removeTabFromPane = (pane: ShallowRef<Pane>, tabId: string): void => {
    const newTabs = { ...pane.value.tabs.value };
    delete newTabs[tabId];
    pane.value.tabs.value = newTabs;
    pane.value = { ...pane.value };
  };

  const shouldRemovePane = (fromPaneId: string): boolean =>
    hasMultiplePanes.value && isPresent(panes.value[fromPaneId]);

  const updateActivePaneIfNeeded = (fromPaneId: string, toPaneId: string): void => {
    const shouldUpdateActivePane = activePaneId.value === fromPaneId;
    if (shouldUpdateActivePane) {
      activePaneId.value = toPaneId;
    }
  };

  const closePane = (paneId: string): void => {
    if (!panes.value[paneId] || Object.keys(panes.value).length === 1) return;

    const newPanes = { ...panes.value };
    delete newPanes[paneId];
    panes.value = newPanes;
    if (activePaneId.value === paneId) {
      activePaneId.value = Object.keys(panes.value)[0];
    }
  };

  const getTabFromPane = (paneId: string, tabId: string): Tab | undefined => {
    const pane = panes.value[paneId];
    if (!pane) return;
    return pane.value?.tabs.value[tabId];
  };

  const updateTabPaneId = (tab: Tab, paneId: string): Tab => ({
    ...tab,
    paneId,
  });

  const addTabToPane = (pane: ShallowRef<Pane>, tab: Tab, index?: number): void => {
    const hasValidIndex = isPresent(index) && index >= 0;
    const newTabs = hasValidIndex
      ? insertTabAtIndex(pane.value.tabs.value, tab, index)
      : appendTab(pane.value.tabs.value, tab);

    pane.value.tabs.value = newTabs;
    pane.value = { ...pane.value };
  };

  const buildRouteParams = (params: RouteLocationRaw, tabId: string): RouteLocationRaw => {
    if (typeof params === 'string') {
      return { path: params };
    }

    if ('name' in params) {
      return { ...params, params: { ...('params' in params ? params.params : {}), tabId } };
    }

    return params;
  };

  const pushToTabs = (pane: ShallowRef<Pane>, tab: Tab): void => {
    pane.value.tabs.value = {
      ...pane.value.tabs.value,
      [tab.id]: tab,
    };
    pane.value = { ...pane.value };
  };

  const setTabAsActive = (pane: ShallowRef<Pane>, tabId: string): void => {
    pane.value = {
      ...pane.value,
      activeTabId: tabId,
    };
  };

  const clearPanesState = (): void => {
    panes.value = {};
  };

  const getTabsForPane = (params: Partial<Pane> | undefined): Record<string, Tab> =>
    params?.tabs?.value ?? {};

  const pushToPanes = (pane: ShallowRef<Pane>): void => {
    panes.value = {
      ...panes.value,
      [pane.value.id]: pane,
    };
  };

  const getActiveTabId = (tabs: Record<string, Tab>): string | undefined => {
    const tabKeys = Object.keys(tabs);
    return tabKeys.length > 0 ? tabKeys[0] : undefined;
  };

  const insertTabAtIndex = (
    tabs: Record<string, Tab>,
    tab: Tab,
    index: number,
  ): Record<string, Tab> => {
    const entries = Object.entries(tabs);
    const validIndex = Math.min(Math.max(0, index), entries.length);

    entries.splice(validIndex, 0, [tab.id, tab]);

    return Object.fromEntries(entries);
  };

  const appendTab = (tabs: Record<string, Tab>, tab: Tab): Record<string, Tab> => ({
    ...tabs,
    [tab.id]: tab,
  });

  const store: PaneStore = {
    panes,
    activePaneId,
    activePane,
    activeTab,
    activeRoute,
    activeBufferUri,
    activeTabTitle,
    afterBufferActivated,
    moveTab,
    createPane,
    getPane,
    closePane,
    setActivePane,
    isDraggingTab,
    draggedTabData,
    initNewTab,
    addTab,
    closeTab,
    selectTab,
    navigate,
    startDraggingTab,
    stopDraggingTab,
    getPanesData,
    restorePanesData,
  };

  return store;
});
