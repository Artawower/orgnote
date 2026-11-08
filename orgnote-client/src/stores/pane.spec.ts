import { expect, test, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { usePaneStore } from './pane';
import { createPinia, setActivePinia } from 'pinia';
import type { PaneSnapshot } from 'orgnote-api';
import { RouteNames } from 'orgnote-api';
import { isNullable } from 'orgnote-api/utils';
import { useBufferViewStateStore } from './buffer-view-state';

const createMockRouter = () => ({
  push: vi.fn(),
  hasRoute: vi.fn(() => true),
  currentRoute: ref({
    path: '/',
    params: {},
    query: {},
    hash: '',
    name: RouteNames.InitialPage,
  }),
});

vi.mock('src/utils/pane-router', () => ({
  createPaneRouter: vi.fn(() => Promise.resolve(createMockRouter())),
}));

function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (isNullable(value)) throw new Error(message);
}

function getPaneValue(paneStore: ReturnType<typeof usePaneStore>, paneId: string) {
  const paneRef = paneStore.getPane(paneId);
  const value = paneRef.value;
  if (!value) throw new Error(`paneRef.value is nullable for pane ${paneId}`);
  return value;
}

test('should create unique tab titles', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneValue = getPaneValue(paneStore, pane.id);
  const activeTab = paneValue.tabs.value[paneValue.activeTabId];
  expect(activeTab?.title).toBe('Untitled');

  const secondTab = await paneStore.addTab(pane.id);
  expect(secondTab?.title).toBe('Untitled 2');

  const thirdTab = await paneStore.addTab(pane.id);
  expect(thirdTab?.title).toBe('Untitled 3');
});

test('should respect custom titles', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Custom Title' });
  const paneValue = getPaneValue(paneStore, pane.id);
  const activeTab = paneValue.tabs.value[paneValue.activeTabId];
  expect(activeTab?.title).toBe('Custom Title');

  const secondTab = await paneStore.addTab(pane.id);
  expect(secondTab?.title).toBe('Untitled');

  const thirdTab = await paneStore.addTab(pane.id);
  expect(thirdTab?.title).toBe('Untitled 2');
});

test('should switch to another tab when active tab is closed', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneId = pane.id;
  const paneValue = getPaneValue(paneStore, paneId);
  const firstTabId = paneValue.activeTabId;
  assertDefined(firstTabId, 'firstTabId is nullable');

  const secondTab = await paneStore.addTab(paneId);
  const secondTabId = secondTab!.id;

  paneStore.selectTab(paneId, secondTabId);
  expect(paneStore.activeTab?.id).toBe(secondTabId);

  paneStore.closeTab(paneId, secondTabId);

  expect(paneStore.activeTab?.id).toBe(firstTabId);
  expect(paneStore.activeTab).toBeDefined();
});

test('should clear view state when a tab is closed', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const closingTab = await paneStore.addTab(pane.id);
  assertDefined(closingTab, 'closingTab is nullable');
  const stateHandle = useBufferViewStateStore().createHandle({
    tabId: closingTab.id,
    bufferUri: 'file:///notes/example.org',
    viewerId: 'builtin:org-rich-editor',
    version: 1,
  });
  stateHandle.set({ cursor: 12 });

  await paneStore.closeTab(pane.id, closingTab.id);

  expect(stateHandle.get()).toBeUndefined();
});

test('should close inactive tab without changing active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneId = pane.id;
  const paneValue = getPaneValue(paneStore, paneId);
  const firstTabId = paneValue.activeTabId;
  assertDefined(firstTabId, 'firstTabId is nullable');

  const secondTab = await paneStore.addTab(paneId);
  const secondTabId = secondTab!.id;

  paneStore.selectTab(paneId, firstTabId);
  expect(paneStore.activeTab?.id).toBe(firstTabId);

  paneStore.closeTab(paneId, secondTabId);
  expect(paneStore.activeTab?.id).toBe(firstTabId);
});

test('should not remove pane when closing last tab but reset route', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneId = pane.id;
  const paneValue = getPaneValue(paneStore, paneId);
  const tabId = paneValue.activeTabId;
  assertDefined(tabId, 'tabId is nullable');
  const stateHandle = useBufferViewStateStore().createHandle({
    tabId,
    bufferUri: 'file:///notes/example.org',
    viewerId: 'builtin:org-rich-editor',
    version: 1,
  });
  stateHandle.set({ cursor: 12 });

  expect(paneStore.panes[paneId]).toBeDefined();
  expect(paneStore.activePaneId).toBe(paneId);

  await paneStore.closeTab(paneId, tabId);

  expect(stateHandle.get()).toBeUndefined();
  expect(paneStore.panes[paneId]).toBeDefined();
  expect(paneStore.activePaneId).toBe(paneId);
  const paneRef = paneStore.getPane(paneId);
  assertDefined(paneRef.value, 'paneRef.value is nullable');
  const tab = Object.values(paneRef.value.tabs.value)[0];
  expect(tab?.router.push).toHaveBeenCalledWith({
    name: RouteNames.InitialPage,
    params: { tabId },
  });
});

test('should handle closing non-existent tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneId = pane.id;
  const activeTabBefore = paneStore.activeTab;

  paneStore.closeTab(paneId, 'non-existent-tab-id');

  expect(paneStore.activeTab).toBe(activeTabBefore);
  expect(paneStore.panes[paneId]).toBeDefined();
});

test('should handle closing tab from non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const activeTabBefore = paneStore.activeTab;

  paneStore.closeTab('non-existent-pane-id', 'some-tab-id');

  expect(paneStore.activeTab).toBe(activeTabBefore);
});

test('should create panes snapshot correctly', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'First Tab' });
  await paneStore.addTab(pane.id, { title: 'Second Tab' });

  const snapshot = paneStore.getPanesData();

  expect(snapshot).toHaveLength(1);
  const snapshotItem = snapshot[0];
  if (isNullable(snapshotItem)) throw new Error('snapshotItem is nullable');
  expect(snapshotItem.id).toBe(pane.id);
  expect(snapshotItem.tabs).toHaveLength(2);
  expect(snapshotItem.tabs[0]?.title).toBe('First Tab');
  expect(snapshotItem.tabs[1]?.title).toBe('Second Tab');
});

test('should restore panes from snapshot', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const originalPane = await paneStore.createPane();
  await paneStore.addTab(originalPane.id, { title: 'Original Tab' });
  const originalSecondTab = await paneStore.addTab(originalPane.id, { title: 'Second Tab' });

  const snapshot = paneStore.getPanesData();

  paneStore.closeTab(originalPane.id, originalSecondTab!.id);
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  const paneValue = getPaneValue(paneStore, originalPane.id);
  expect(Object.keys(paneValue.tabs.value)).toHaveLength(1);

  await paneStore.restorePanesData(snapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  const snapshotItem = snapshot[0];
  if (isNullable(snapshotItem)) throw new Error('snapshotItem is nullable');
  expect(paneStore.activePaneId).toBe(snapshotItem.id);

  const restoredPaneValue = getPaneValue(paneStore, snapshotItem.id);
  const firstTab = snapshotItem.tabs[0];
  const restoredSecondTab = snapshotItem.tabs[1];
  assertDefined(firstTab, 'firstTab is nullable');
  assertDefined(restoredSecondTab, 'secondTab is nullable');
  expect(restoredPaneValue.tabs.value).toHaveProperty(firstTab.id);
  expect(restoredPaneValue.tabs.value).toHaveProperty(restoredSecondTab.id);
});

test('restorePanesData restores an unnamed route by path', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'File' });
  const snapshot = paneStore.getPanesData();
  const tabSnapshot = snapshot[0]!.tabs[0]!;
  tabSnapshot.routeLocation.name = undefined;
  tabSnapshot.routeLocation.path = `/${tabSnapshot.id}/file/notes/example.org`;

  await paneStore.restorePanesData(snapshot);

  const restoredTab = Object.values(getPaneValue(paneStore, pane.id).tabs.value)[0]!;
  expect(restoredTab.router.push).toHaveBeenCalledWith(tabSnapshot.routeLocation.path);
});

test('restorePanesData selects a persisted tab when activeTabId is invalid', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const pane = await paneStore.createPane();
  const firstTab = await paneStore.addTab(pane.id, { title: 'First' });
  await paneStore.addTab(pane.id, { title: 'Second' });
  const snapshot = paneStore.getPanesData();
  snapshot[0]!.activeTabId = 'missing-tab';

  await paneStore.restorePanesData(snapshot);

  assertDefined(firstTab, 'firstTab is nullable');
  expect(getPaneValue(paneStore, pane.id).activeTabId).toBe(firstTab.id);
});

test('should create empty snapshot when no panes exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const snapshot = paneStore.getPanesData();

  expect(snapshot).toHaveLength(0);
});

test('should handle restoring empty snapshot', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  expect(Object.keys(paneStore.panes)).toHaveLength(1);

  const emptySnapshot: PaneSnapshot[] = [];

  await paneStore.restorePanesData(emptySnapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(0);
  expect(paneStore.activePaneId).toBeUndefined();
});

test('should handle selectTab with non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const originalActiveTab = paneStore.activeTab;

  paneStore.selectTab('non-existent-pane', 'some-tab-id');

  expect(paneStore.activeTab).toBe(originalActiveTab);
});

test('should handle selectTab with non-existent tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const originalActiveTab = paneStore.activeTab;

  paneStore.selectTab(pane.id, 'non-existent-tab-id');

  expect(paneStore.activeTab).toBe(originalActiveTab);
});

test('should set active pane when selecting tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id);

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id);

  expect(paneStore.activePaneId).toBe(pane2.id);

  paneStore.selectTab(pane1.id, tab1!.id);

  expect(paneStore.activePaneId).toBe(pane1.id);
  expect(paneStore.activePane?.id).toBe(pane1.id);
  expect(paneStore.activeTab?.id).toBe(tab1!.id);
});

test('should filter embedded tabs from snapshot', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Stable Tab' });
  
  const embeddedTab = await paneStore.addTab(pane.id, { title: 'Embedded Tab' });
  if (embeddedTab) {
    embeddedTab.router.currentRoute.value.name = RouteNames.Embedded;
  }

  const snapshot = paneStore.getPanesData();

  expect(snapshot).toHaveLength(1);
  expect(snapshot[0]?.tabs).toHaveLength(1);
  expect(snapshot[0]?.tabs[0]?.title).toBe('Stable Tab');
});

test('should not include panes with only embedded tabs in snapshot', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  const embeddedTab = await paneStore.addTab(pane.id, { title: 'Embedded Tab' });
  if (embeddedTab) {
    embeddedTab.router.currentRoute.value.name = RouteNames.Embedded;
  }

  const snapshot = paneStore.getPanesData();

  expect(snapshot).toHaveLength(0);
});

test('should update activeTabId when current active tab is embedded and filtered', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  const stableTab = await paneStore.addTab(pane.id, { title: 'Stable' });
  const embeddedTab = await paneStore.addTab(pane.id, { title: 'Embedded' });
  
  if (embeddedTab) {
    embeddedTab.router.currentRoute.value.name = RouteNames.Embedded;
    paneStore.selectTab(pane.id, embeddedTab.id);
  }

  const snapshot = paneStore.getPanesData();

  expect(snapshot[0]?.activeTabId).toBe(stableTab?.id);
});


test('should throw error when navigate to non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await expect(paneStore.navigate({ path: '/path' }, 'non-existent-pane')).rejects.toThrow(
    'Pane non-existent-pane not found',
  );
});

test('should throw error when navigate to non-existent tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  await expect(paneStore.navigate({ path: '/path' }, pane.id, 'non-existent-tab')).rejects.toThrow(
    'Tab non-existent-tab not found or has no router',
  );
});

test('closeTab should remove empty pane when other panes exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.createPane();
  await paneStore.addTab(firstPane.id, { title: 'First Pane' });
  const firstPaneId = firstPane.id;

  const secondPane = await paneStore.createPane();
  await paneStore.addTab(secondPane.id, { title: 'Second Pane' });
  const secondPaneId = secondPane.id;
  const secondPaneValue = getPaneValue(paneStore, secondPaneId);
  const secondTabId = secondPaneValue.activeTabId;
  assertDefined(secondTabId, 'secondTabId is nullable');

  expect(Object.keys(paneStore.panes)).toHaveLength(2);
  expect(paneStore.activePaneId).toBe(secondPaneId);

  paneStore.closeTab(secondPaneId, secondTabId);

  expect(paneStore.panes[secondPaneId]).toBeUndefined();
  expect(paneStore.panes[firstPaneId]).toBeDefined();
  expect(paneStore.activePaneId).not.toBe(secondPaneId);
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
});

test('closeTab should keep last pane and show InitialPage when its only tab is closed', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Only Pane' });
  const paneId = pane.id;
  const paneValue = getPaneValue(paneStore, paneId);
  const tabId = paneValue.activeTabId;
  assertDefined(tabId, 'tabId is nullable');

  expect(Object.keys(paneStore.panes)).toHaveLength(1);

  paneStore.closeTab(paneId, tabId);

  expect(paneStore.panes[paneId]).toBeDefined();
  expect(paneStore.activePaneId).toBe(paneId);
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  const paneRef = paneStore.getPane(paneId);
  assertDefined(paneRef.value, 'paneRef.value is nullable');
  const tab = Object.values(paneRef.value.tabs.value)[0];
  expect(tab?.router.push).toHaveBeenCalledWith({
    name: RouteNames.InitialPage,
    params: { tabId },
  });
});

test('cleanupEmptyPane should be reachable and remove pane correctly', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.createPane();
  await paneStore.addTab(firstPane.id);
  const firstPaneId = firstPane.id;

  const secondPane = await paneStore.createPane();
  await paneStore.addTab(secondPane.id);
  const secondPaneId = secondPane.id;
  const secondPaneValue = getPaneValue(paneStore, secondPaneId);
  const secondTabId = secondPaneValue.activeTabId;
  assertDefined(secondTabId, 'secondTabId is nullable');

  const thirdTab = await paneStore.addTab(secondPaneId, { title: 'Third tab' });
  const secondPaneValueForCheck = getPaneValue(paneStore, secondPaneId);
  expect(Object.keys(secondPaneValueForCheck.tabs.value)).toHaveLength(2);

  paneStore.closeTab(secondPaneId, secondTabId);
  const secondPaneValueAfterClose = getPaneValue(paneStore, secondPaneId);
  expect(Object.keys(secondPaneValueAfterClose.tabs.value)).toHaveLength(1);

  paneStore.closeTab(secondPaneId, thirdTab!.id);

  expect(paneStore.panes[secondPaneId]).toBeUndefined();
  expect(paneStore.panes[firstPaneId]).toBeDefined();
});

test('createPane should create a new pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();

  expect(pane.id).toBeDefined();
  expect(paneStore.panes[pane.id]).toBeDefined();
  expect(paneStore.activePaneId).toBe(pane.id);
});

test('closePane preserves the only pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  paneStore.closePane(pane.id);

  expect(paneStore.panes[pane.id]).toBeDefined();
  expect(paneStore.activePaneId).toBe(pane.id);
});

test('closePane removes a pane when another pane remains', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const firstPane = await paneStore.createPane();
  await paneStore.addTab(firstPane.id);
  const secondPane = await paneStore.createPane();
  await paneStore.addTab(secondPane.id);

  paneStore.closePane(secondPane.id);

  expect(paneStore.panes[secondPane.id]).toBeUndefined();
  expect(paneStore.activePaneId).toBe(firstPane.id);
});

test('setActivePane should set active pane ID', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.createPane();
  await paneStore.addTab(firstPane.id);
  const secondPane = await paneStore.createPane();
  await paneStore.addTab(secondPane.id);

  expect(paneStore.activePaneId).toBe(secondPane.id);

  paneStore.setActivePane(firstPane.id);

  expect(paneStore.activePaneId).toBe(firstPane.id);
});

test('getPane should return pane ref', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  const paneValue = getPaneValue(paneStore, pane.id);

  expect(paneValue.id).toBe(pane.id);
});

test('getPane should throw error for non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  expect(() => {
    paneStore.getPane('non-existent-id');
  }).toThrow();
});

test('activePane should return active pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  expect(paneStore.activePane?.id).toBe(pane.id);
});

test('activeTab should return active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Test Tab' });

  expect(paneStore.activeTab?.title).toBe('Test Tab');
});

test('startDraggingTab should set dragging state', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneValue = getPaneValue(paneStore, pane.id);
  const tabId = paneValue.activeTabId;
  if (isNullable(tabId)) throw new Error('tabId is nullable');

  paneStore.startDraggingTab(tabId, pane.id);

  expect(paneStore.isDraggingTab).toBe(true);
  expect(paneStore.draggedTabData).toEqual({ tabId, paneId: pane.id });
});

test('stopDraggingTab should clear dragging state', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneValue = getPaneValue(paneStore, pane.id);
  const tabId = paneValue.activeTabId;
  if (isNullable(tabId)) throw new Error('tabId is nullable');

  paneStore.startDraggingTab(tabId, pane.id);
  paneStore.stopDraggingTab();

  expect(paneStore.isDraggingTab).toBe(false);
  expect(paneStore.draggedTabData).toBeUndefined();
});

test('should move tab between panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  await paneStore.addTab(pane1.id, { title: 'Tab 1.5' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  const movedTab = await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(movedTab).toBeTruthy();
  expect(movedTab?.paneId).toBe(pane2.id);
  expect(getPaneValue(paneStore, pane2.id).tabs.value[tab1!.id]).toBeDefined();
});

test('should move tab to specific index', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });
  await paneStore.addTab(pane2.id, { title: 'Tab 3' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id, 1);

  const tabKeys = Object.keys(getPaneValue(paneStore, pane2.id).tabs.value);
  expect(tabKeys[1]).toBe(tab1!.id);
});

test('should activate moved tab in target pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(getPaneValue(paneStore, pane2.id).activeTabId).toBe(tab1!.id);
  expect(paneStore.activePaneId).toBe(pane2.id);
});

test('should remove tab from source pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  await paneStore.addTab(pane1.id, { title: 'Tab 1.5' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(getPaneValue(paneStore, pane1.id).tabs.value[tab1!.id]).toBeUndefined();
});

test('should handle moving last tab from pane with multiple panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(paneStore.panes[pane1.id]).toBeUndefined();
});

test('should remove source pane when empty and multiple panes exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(paneStore.panes[pane1.id]).toBeUndefined();
});

test('should activate moved tab when it was active', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  await paneStore.addTab(pane1.id, { title: 'Tab 2' });

  paneStore.selectTab(pane1.id, tab1!.id);

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 3' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(paneStore.activePaneId).toBe(pane2.id);
  expect(getPaneValue(paneStore, pane2.id).activeTabId).toBe(tab1!.id);
});

test('should activate first tab in source pane after move', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  const tab2 = await paneStore.addTab(pane1.id, { title: 'Tab 2' });

  paneStore.selectTab(pane1.id, tab2!.id);

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 3' });

  await paneStore.moveTab(tab2!.id, pane1.id, pane2.id);

  expect(getPaneValue(paneStore, pane1.id).activeTabId).toBe(tab1!.id);
});

test('should return moved tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  const result = await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(result).toBeTruthy();
  expect(result?.id).toBe(tab1!.id);
  expect(result?.paneId).toBe(pane2.id);
});

test('should return undefined when tab not found', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  const result = await paneStore.moveTab('non-existent-id', pane1.id, pane2.id);

  expect(result).toBeUndefined();
});

test('should return undefined when panes not found', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const result = await paneStore.moveTab('tab-id', 'non-existent-pane-1', 'non-existent-pane-2');

  expect(result).toBeUndefined();
});

test('should handle moving to same pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  await paneStore.addTab(pane1.id, { title: 'Tab 2' });

  const result = await paneStore.moveTab(tab1!.id, pane1.id, pane1.id);

  expect(result).toBeTruthy();
  expect(getPaneValue(paneStore, pane1.id).tabs.value[tab1!.id]).toBeDefined();
});

test('navigate should call router push on active tab in active pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  await paneStore.navigate({ name: 'EditNote', params: { path: 'test.org' } });

  const tab = Object.values(getPaneValue(paneStore, pane.id).tabs.value)[0];
  expect(tab?.router.push).toHaveBeenLastCalledWith({
    name: 'EditNote',
    params: { path: 'test.org', tabId: tab?.id },
  });
});

test('navigate should call router push on specific pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  await paneStore.navigate({ name: 'EditNote', params: { path: 'test.org' } }, pane.id);

  const tab = Object.values(getPaneValue(paneStore, pane.id).tabs.value)[0];
  expect(tab?.router.push).toHaveBeenLastCalledWith({
    name: 'EditNote',
    params: { path: 'test.org', tabId: tab?.id },
  });
});

test('navigate should handle string route params', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  await paneStore.navigate('/test-path');

  const tab = Object.values(getPaneValue(paneStore, pane.id).tabs.value)[0];
  expect(tab?.router.push).toHaveBeenLastCalledWith({ path: '/test-path' });
});

test('navigate should throw when pane has no active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await expect(paneStore.navigate({ path: '/test-path' })).rejects.toThrow();
});

test('navigate should call router push on specific tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  const tab = await paneStore.addTab(pane.id);

  await paneStore.navigate({ name: 'EditNote', params: { path: 'test.org' } }, pane.id, tab!.id);

  expect(tab?.router.push).toHaveBeenCalledWith({
    name: 'EditNote',
    params: { path: 'test.org', tabId: tab?.id },
  });
});

test('navigate should handle string route with specific tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  const tab = await paneStore.addTab(pane.id);

  await paneStore.navigate('/edit-note/test.org', pane.id, tab!.id);

  expect(tab?.router.push).toHaveBeenLastCalledWith({
    path: '/edit-note/test.org',
  });
});

test('navigate should preserve existing params', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  const tab = await paneStore.addTab(pane.id);

  await paneStore.navigate(
    {
      name: 'EditNote',
      params: { path: 'test.org', customParam: 'value' },
    },
    pane.id,
    tab!.id,
  );

  expect(tab?.router.push).toHaveBeenCalledWith({
    name: 'EditNote',
    params: { path: 'test.org', customParam: 'value', tabId: tab?.id },
  });
});

test('addTab should return undefined when pane does not exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const result = await paneStore.addTab('non-existent-pane-id');

  expect(result).toBeUndefined();
});

test('setActivePane should throw error for non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  expect(() => {
    paneStore.setActivePane('non-existent-pane-id');
  }).toThrow();
});

test('activePane should return undefined when no active pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  expect(paneStore.activePane).toBeUndefined();
});

test('activeTab should return undefined when no active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.createPane();

  expect(paneStore.activeTab).toBeUndefined();
});

test('closeTab should not affect other panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Pane 1 Tab' });

  const pane2 = await paneStore.createPane();
  const tab2 = await paneStore.addTab(pane2.id, { title: 'Pane 2 Tab' });

  paneStore.closeTab(pane2.id, tab2!.id);

  expect(getPaneValue(paneStore, pane1.id).tabs.value[tab1!.id]).toBeDefined();
  expect(getPaneValue(paneStore, pane1.id).tabs.value[tab1!.id]?.title).toBe('Pane 1 Tab');
});

test('should handle multiple tabs with same title pattern', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  await paneStore.addTab(pane.id);
  await paneStore.addTab(pane.id);
  const tab4 = await paneStore.addTab(pane.id);

  expect(tab4?.title).toBe('Untitled 4');
});

test('restorePanesData should restore multiple panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  await paneStore.addTab(pane1.id, { title: 'Pane 1 Tab' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Pane 2 Tab' });

  const snapshot = paneStore.getPanesData();

  paneStore.closePane(pane1.id);
  paneStore.closePane(pane2.id);

  await paneStore.restorePanesData(snapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(2);
  expect(paneStore.panes[pane1.id]).toBeDefined();
  expect(paneStore.panes[pane2.id]).toBeDefined();
});

test('should activate remaining pane when closing last tab in active pane with multiple panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Pane 1 Tab' });

  const pane2 = await paneStore.createPane();
  const tab2 = await paneStore.addTab(pane2.id, { title: 'Pane 2 Tab' });

  paneStore.setActivePane(pane2.id);
  expect(paneStore.activePaneId).toBe(pane2.id);

  paneStore.closeTab(pane2.id, tab2!.id);

  expect(paneStore.activePaneId).toBe(pane1.id);
  expect(paneStore.activePane).toBeDefined();
  expect(paneStore.activePane?.activeTabId).toBeTruthy();
  expect(paneStore.activeTab).toBeDefined();
  expect(paneStore.activeTab?.id).toBe(tab1!.id);
});

test('BUG: should activate tab in remaining pane when it has no active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Pane 1 Tab' });

  const pane2 = await paneStore.createPane();
  const tab2 = await paneStore.addTab(pane2.id, { title: 'Pane 2 Tab' });

  const pane1Ref = paneStore.panes[pane1.id];
  if (pane1Ref?.value) {
    pane1Ref.value = {
      ...pane1Ref.value,
      activeTabId: '',
    };
  }

  paneStore.setActivePane(pane2.id);

  paneStore.closeTab(pane2.id, tab2!.id);

  expect(paneStore.activePaneId).toBe(pane1.id);
  expect(paneStore.activePane?.activeTabId).toBe(tab1!.id);
  expect(paneStore.activeTab).toBeDefined();
  expect(paneStore.activeTab?.id).toBe(tab1!.id);
});

test('activeTabTitle should reflect file name after navigation to file route', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  const activeTab = paneStore.activeTab;
  assertDefined(activeTab, 'activeTab is not defined');

  Object.assign(activeTab.router.currentRoute.value, {
    name: RouteNames.File,
    params: { tabId: activeTab.id, path: 'notes/my-note.org' },
    meta: {
      titleGenerator: (route: { params: { path: string } }) =>
        route.params.path.split('/').pop() ?? '',
    },
  });

  expect(paneStore.activeTabTitle).toBe('my-note.org');
});

test('afterBufferActivated emits when another tab with the same URI is activated', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const pane = await paneStore.createPane();
  const firstTab = await paneStore.addTab(pane.id);
  const secondTab = await paneStore.addTab(pane.id);
  assertDefined(firstTab, 'firstTab is not defined');
  assertDefined(secondTab, 'secondTab is not defined');
  const callback = vi.fn();

  paneStore.selectTab(pane.id, firstTab.id);
  await nextTick();
  paneStore.afterBufferActivated(callback);
  paneStore.selectTab(pane.id, secondTab.id);
  await nextTick();

  expect(callback).toHaveBeenCalledOnce();
  expect(callback).toHaveBeenCalledWith({
    current: { paneId: pane.id, tabId: secondTab.id, uri: undefined },
    previous: { paneId: pane.id, tabId: firstTab.id, uri: undefined },
  });
});

test('afterBufferActivated emits when the active tab navigates to another buffer', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const pane = await paneStore.createPane();
  const tab = await paneStore.addTab(pane.id);
  assertDefined(tab, 'tab is not defined');
  const callback = vi.fn();

  paneStore.afterBufferActivated(callback);
  Object.assign(tab.router.currentRoute.value, {
    name: RouteNames.File,
    params: { tabId: tab.id, path: '/notes/today.org' },
  });
  await nextTick();

  expect(callback).toHaveBeenCalledOnce();
  expect(callback).toHaveBeenCalledWith({
    current: { paneId: pane.id, tabId: tab.id, uri: 'file:///notes/today.org' },
    previous: { paneId: pane.id, tabId: tab.id, uri: undefined },
  });
});

test('afterBufferActivated immediately emits current state and unsubscribes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const pane = await paneStore.createPane();
  const firstTab = await paneStore.addTab(pane.id);
  const secondTab = await paneStore.addTab(pane.id);
  assertDefined(firstTab, 'firstTab is not defined');
  assertDefined(secondTab, 'secondTab is not defined');
  const callback = vi.fn();

  const unsubscribe = paneStore.afterBufferActivated(callback, { immediate: true });
  await nextTick();

  expect(callback).toHaveBeenCalledOnce();
  expect(callback).toHaveBeenLastCalledWith({
    current: { paneId: pane.id, tabId: secondTab.id, uri: undefined },
  });

  unsubscribe();
  paneStore.selectTab(pane.id, firstTab.id);
  await nextTick();

  expect(callback).toHaveBeenCalledOnce();
});
