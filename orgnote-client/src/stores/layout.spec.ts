import { test, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLayoutStore } from './layout';
import { usePaneStore } from './pane';
import type { LayoutSnapshot } from 'orgnote-api';
import { RouteNames } from 'orgnote-api';
import { isPresent } from 'orgnote-api/utils';

const createMockRouter = () => ({
  push: vi.fn(),
  hasRoute: vi.fn(() => true),
  currentRoute: {
    value: {
      path: '/',
      params: {},
      query: {},
      hash: '',
      name: RouteNames.InitialPage,
    },
  },
});

vi.mock('src/utils/pane-router', () => ({
  createPaneRouter: vi.fn(() => Promise.resolve(createMockRouter())),
}));

vi.mock('src/boot/repositories', () => ({
  repositories: {
    layoutSnapshotRepository: {
      save: vi.fn(() => Promise.resolve()),
      getLatest: vi.fn(() => Promise.resolve(null)),
    },
  },
}));

vi.mock('src/boot/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

beforeEach(async () => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

test('should initialize layout with single pane', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();

  expect(layoutStore.layout).toBeDefined();
  expect(layoutStore.layout?.type).toBe('pane');
  expect(paneStore.activePaneId).toBeTruthy();
});

test('ensureLayout initializes a missing layout', async () => {
  const layoutStore = useLayoutStore();

  await layoutStore.ensureLayout();

  expect(layoutStore.layout?.type).toBe('pane');
});

test('ensureLayout preserves an existing split layout', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  await layoutStore.splitPaneInLayout(paneStore.activePaneId!, 'right');
  const splitLayout = layoutStore.layout;

  await layoutStore.ensureLayout();

  expect(layoutStore.layout).toBe(splitLayout);
  expect(layoutStore.layout?.type).toBe('split');
  expect(Object.keys(paneStore.panes)).toHaveLength(2);
});

test('initLayout preserves a provided layout', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();
  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const providedLayout = { type: 'pane', id: 'provided-layout', paneId: pane.id } as const;

  await layoutStore.initLayout(providedLayout);

  expect(layoutStore.layout).toBe(providedLayout);
});

test('should initialize layout with existing activePaneId', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  paneStore.setActivePane(pane.id);

  await layoutStore.initLayout();

  expect(layoutStore.layout?.type).toBe('pane');
  if (layoutStore.layout?.type === 'pane') {
    expect(layoutStore.layout.paneId).toBe(pane.id);
  }
});

test('should create pane when no activePaneId exists', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  expect(paneStore.activePaneId).toBeUndefined();

  await layoutStore.initLayout();

  expect(paneStore.activePaneId).toBeTruthy();
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
});

test('should add initial tab to new pane', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();

  const paneId = paneStore.activePaneId!;
  const pane = paneStore.getPane(paneId);
  
  if (!isPresent(pane.value)) {
    throw new Error('Pane not found');
  }

  const tabCount = Object.keys(pane.value.tabs.value).length;

  expect(tabCount).toBe(1);
});

test('should split pane horizontally to left', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'left');

  expect(newPaneId).toBeTruthy();
  
  const layout = layoutStore.layout;
  if (!isPresent(layout)) {
    throw new Error('Layout not found');
  }

  expect(layout.type).toBe('split');
  if (layout.type === 'split') {
    const children = layout.children;
    expect(layout.orientation).toBe('horizontal');
    expect(children).toHaveLength(2);
    
    const firstChild = children[0];
    if (!isPresent(firstChild)) {
      throw new Error('First child not found');
    }
    expect(firstChild.type).toBe('pane');
  }
});

test('should split pane horizontally to right', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'right');

  expect(newPaneId).toBeTruthy();
  
  const layout = layoutStore.layout;
  if (!isPresent(layout)) {
    throw new Error('Layout not found');
  }

  expect(layout.type).toBe('split');
  if (layout.type === 'split') {
    const children = layout.children;
    expect(layout.orientation).toBe('horizontal');
    
    const secondChild = children[1];
    if (!isPresent(secondChild)) {
      throw new Error('Second child not found');
    }
    expect(secondChild.type).toBe('pane');
  }
});

test('should split pane vertically to top', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'top');

  expect(newPaneId).toBeTruthy();
  
  const layout = layoutStore.layout;
  if (!isPresent(layout)) {
    throw new Error('Layout not found');
  }

  expect(layout.type).toBe('split');
  if (layout.type === 'split') {
    const children = layout.children;
    expect(layout.orientation).toBe('vertical');
    
    const firstChild = children[0];
    if (!isPresent(firstChild)) {
      throw new Error('First child not found');
    }
    expect(firstChild.type).toBe('pane');
  }
});

test('should split pane vertically to bottom', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'bottom');

  expect(newPaneId).toBeTruthy();
  
  const layout = layoutStore.layout;
  if (!isPresent(layout)) {
    throw new Error('Layout not found');
  }

  expect(layout.type).toBe('split');
  if (layout.type === 'split') {
    const children = layout.children;
    expect(layout.orientation).toBe('vertical');
    
    const secondChild = children[1];
    if (!isPresent(secondChild)) {
      throw new Error('Second child not found');
    }
    expect(secondChild.type).toBe('pane');
  }
});

test('should create pane with initial tab when splitting', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'right', true);

  expect(newPaneId).toBeTruthy();
  
  if (!isPresent(newPaneId)) {
    throw new Error('New pane ID not found');
  }

  const newPane = paneStore.getPane(newPaneId);
  
  if (!isPresent(newPane.value)) {
    throw new Error('New pane not found');
  }

  const tabCount = Object.keys(newPane.value.tabs.value).length;
  expect(tabCount).toBe(1);
});

test('should create empty pane when splitting without initial tab', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'right', false);

  expect(newPaneId).toBeTruthy();
  
  if (!isPresent(newPaneId)) {
    throw new Error('New pane ID not found');
  }

  const newPane = paneStore.getPane(newPaneId);
  
  if (!isPresent(newPane.value)) {
    throw new Error('New pane not found');
  }

  const tabCount = Object.keys(newPane.value.tabs.value).length;
  expect(tabCount).toBe(0);
});

test('should update layout tree correctly after split', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  await layoutStore.splitPaneInLayout(originalPaneId, 'right');

  expect(layoutStore.layout?.type).toBe('split');
  if (layoutStore.layout?.type === 'split') {
    expect(layoutStore.layout.children).toHaveLength(2);
  }
});

test('should activate new pane after split', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'right');

  expect(paneStore.activePaneId).toBe(newPaneId);
});

test('should throw error when splitting non-existent pane', async () => {
  const layoutStore = useLayoutStore();

  await layoutStore.initLayout();

  await expect(layoutStore.splitPaneInLayout('non-existent-id', 'right')).rejects.toThrow('Pane non-existent-id not found in layout');
});

test('should init layout before split if layout is missing', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  paneStore.setActivePane(pane.id);

  await layoutStore.initLayout();
  const newPaneId = await layoutStore.splitPaneInLayout(pane.id, 'right');

  expect(newPaneId).toBeTruthy();
  expect(layoutStore.layout).toBeDefined();
});

test('closePane preserves the final pane referenced by the layout', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();
  await layoutStore.initLayout();
  const paneId = paneStore.activePaneId!;

  paneStore.closePane(paneId);

  expect(paneStore.panes[paneId]).toBeDefined();
  expect(paneStore.activePaneId).toBe(paneId);
  expect(layoutStore.layout).toMatchObject({ type: 'pane', paneId });
});

test('should remove pane from layout tree', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const pane1Id = paneStore.activePaneId!;
  const pane2Id = await layoutStore.splitPaneInLayout(pane1Id, 'right');

  layoutStore.removePaneFromLayout(pane2Id!);

  expect(layoutStore.layout?.type).toBe('pane');
  if (layoutStore.layout?.type === 'pane') {
    expect(layoutStore.layout.paneId).toBe(pane1Id);
  }
});

test('should normalize split node when only one child remains', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const pane1Id = paneStore.activePaneId!;
  const pane2Id = await layoutStore.splitPaneInLayout(pane1Id, 'right');

  layoutStore.removePaneFromLayout(pane2Id!);

  expect(layoutStore.layout?.type).toBe('pane');
});

test('should handle removing from nested split nodes', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const pane1Id = paneStore.activePaneId!;
  const pane2Id = await layoutStore.splitPaneInLayout(pane1Id, 'right');
  const pane3Id = await layoutStore.splitPaneInLayout(pane2Id!, 'bottom');

  layoutStore.removePaneFromLayout(pane3Id!);

  expect(layoutStore.layout?.type).toBe('split');
});

test('should normalize sizes to 100%', () => {
  const layoutStore = useLayoutStore();

  const normalized = layoutStore.normalizeSizes([30, 70]);

  expect(normalized).toEqual([30, 70]);
});

test('should handle invalid sizes', () => {
  const layoutStore = useLayoutStore();

  const normalized = layoutStore.normalizeSizes([20, 30]);

  const sum = normalized.reduce((a, b) => a + b, 0);
  expect(Math.abs(sum - 100)).toBeLessThan(0.01);
});

test('should save workspace snapshot', async () => {
  await import('src/boot/repositories');
  const layoutStore = useLayoutStore();

  await layoutStore.initLayout();

  const snapshot = layoutStore.getLayoutSnapshot();

  expect(snapshot).toHaveProperty('panes');
  expect(snapshot).toHaveProperty('activePaneId');
  expect(snapshot).toHaveProperty('timestamp');
  expect(snapshot).toHaveProperty('layout');
});

test('should restore workspace from snapshot', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;
  const snapshot = layoutStore.getLayoutSnapshot();

  if (!isPresent(snapshot)) {
    throw new Error('Snapshot not found');
  }

  await layoutStore.restoreLayoutSnapshot(snapshot);

  expect(paneStore.activePaneId).toBe(originalPaneId);
  expect(layoutStore.layout).toBeDefined();
});

test('should include layout in snapshot', async () => {
  const layoutStore = useLayoutStore();

  await layoutStore.initLayout();
  const snapshot = layoutStore.getLayoutSnapshot();

  if (!isPresent(snapshot)) {
    throw new Error('Snapshot not found');
  }

  expect(snapshot.layout).toBeDefined();
});

test('should restore activePaneId from snapshot', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const pane1 = await paneStore.createPane();
  await paneStore.addTab(pane1.id);

  const layout = layoutStore.layout;
  if (!isPresent(layout)) {
    throw new Error('Layout not found');
  }

  const snapshot: LayoutSnapshot = {
    panes: [
      {
        id: pane1.id,
        activeTabId: '',
        tabs: [],
      },
    ],
    activePaneId: pane1.id,
    timestamp: Date.now(),
    layout,
  };

  await layoutStore.restoreLayoutSnapshot(snapshot);

  expect(paneStore.activePaneId).toBe(pane1.id);
});

test('should init layout during restore if snapshot panes are empty', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const existingPanesCount = Object.keys(paneStore.panes).length;
  expect(existingPanesCount).toBeGreaterThan(0);

  const snapshot: LayoutSnapshot = {
    panes: [],
    activePaneId: '',
    timestamp: Date.now(),
    layout: { type: 'pane', id: '', paneId: '' },
  };

  await layoutStore.restoreLayoutSnapshot(snapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(1);
});

test('should init layout when no snapshot available', async () => {
  const { repositories } = await import('src/boot/repositories');
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  (repositories.layoutSnapshotRepository.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(
    null,
  );

  await layoutStore.restoreLayout();

  expect(paneStore.activePaneId).toBeTruthy();
});

test('updateNodeSizes updates sizes for root split node', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const paneId = paneStore.activePaneId!;
  await layoutStore.splitPaneInLayout(paneId, 'right');

  const splitNode = layoutStore.layout;
  expect(splitNode?.type).toBe('split');
  if (splitNode?.type !== 'split') return;

  layoutStore.updateNodeSizes(splitNode.id, [60, 40]);

  expect(layoutStore.layout?.type).toBe('split');
  if (layoutStore.layout?.type === 'split') {
    expect(layoutStore.layout.sizes).toEqual([60, 40]);
  }
});

test('updateNodeSizes updates sizes for nested split node', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const firstPaneId = paneStore.activePaneId!;
  await layoutStore.splitPaneInLayout(firstPaneId, 'right');

  const secondPaneId = paneStore.activePaneId!;
  await layoutStore.splitPaneInLayout(secondPaneId, 'bottom');

  const rootNode = layoutStore.layout;
  expect(rootNode?.type).toBe('split');
  if (rootNode?.type !== 'split') return;

  const nestedNode = rootNode.children.find((c) => c.type === 'split');
  expect(nestedNode?.type).toBe('split');
  if (nestedNode?.type !== 'split') return;

  layoutStore.updateNodeSizes(nestedNode.id, [70, 30]);

  const updatedRoot = layoutStore.layout;
  if (updatedRoot?.type !== 'split') return;

  const updatedNested = updatedRoot.children.find((c) => c.type === 'split');
  if (updatedNested?.type !== 'split') return;

  expect(updatedNested.sizes).toEqual([70, 30]);
});

test('updateNodeSizes creates new object references for immutability', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const paneId = paneStore.activePaneId!;
  await layoutStore.splitPaneInLayout(paneId, 'right');

  const originalLayout = layoutStore.layout;

  if (originalLayout?.type !== 'split') return;

  layoutStore.updateNodeSizes(originalLayout.id, [55, 45]);

  expect(layoutStore.layout).not.toBe(originalLayout);
});

test('updateNodeSizes does nothing when layout is undefined', () => {
  const layoutStore = useLayoutStore();

  expect(layoutStore.layout).toBeUndefined();
  layoutStore.updateNodeSizes('non-existent-id', [50, 50]);
  expect(layoutStore.layout).toBeUndefined();
});

test('getPanePosition returns center for single pane layout', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const paneId = paneStore.activePaneId!;

  const position = layoutStore.getPanePosition(paneId);
  expect(position).toEqual({ horizontal: 'center', vertical: 'center' });
});

test('getPanePosition returns correct positions for horizontal split', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const leftPaneId = paneStore.activePaneId!;
  const rightPaneId = await layoutStore.splitPaneInLayout(leftPaneId, 'right');

  expect(layoutStore.getPanePosition(leftPaneId)).toEqual({ horizontal: 'left', vertical: 'center' });
  expect(layoutStore.getPanePosition(rightPaneId!)).toEqual({ horizontal: 'right', vertical: 'center' });
});

test('getPanePosition returns correct positions for vertical split', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const topPaneId = paneStore.activePaneId!;
  const bottomPaneId = await layoutStore.splitPaneInLayout(topPaneId, 'bottom');

  expect(layoutStore.getPanePosition(topPaneId)).toEqual({ horizontal: 'center', vertical: 'top' });
  expect(layoutStore.getPanePosition(bottomPaneId!)).toEqual({ horizontal: 'center', vertical: 'bottom' });
});

test('getPanePosition returns correct positions for complex layout', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const leftPaneId = paneStore.activePaneId!;
  const rightPaneId = await layoutStore.splitPaneInLayout(leftPaneId, 'right');
  const bottomRightPaneId = await layoutStore.splitPaneInLayout(rightPaneId!, 'bottom');

  expect(layoutStore.getPanePosition(leftPaneId)).toEqual({ horizontal: 'left', vertical: 'center' });
  expect(layoutStore.getPanePosition(rightPaneId!)).toEqual({ horizontal: 'right', vertical: 'top' });
  expect(layoutStore.getPanePosition(bottomRightPaneId!)).toEqual({ horizontal: 'right', vertical: 'bottom' });
});

test('getPanePosition returns undefined for non-existent pane', async () => {
  const layoutStore = useLayoutStore();

  await layoutStore.initLayout();

  expect(layoutStore.getPanePosition('non-existent')).toBeUndefined();
});

test('getPanePosition returns undefined when layout is undefined', () => {
  const layoutStore = useLayoutStore();

  expect(layoutStore.getPanePosition('any-id')).toBeUndefined();
});

test('getLayoutSnapshot removes transient-only panes from the persisted workspace', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();
  await layoutStore.initLayout();

  const stablePaneId = paneStore.activePaneId!;
  const transientPaneId = await layoutStore.splitPaneInLayout(stablePaneId, 'right');
  const transientPane = paneStore.panes[transientPaneId!]!;
  const transientTab = Object.values(transientPane.value.tabs.value)[0]!;
  transientTab.router.currentRoute.value.name = RouteNames.Embedded;

  const snapshot = layoutStore.getLayoutSnapshot();

  expect(snapshot?.panes.map((pane) => pane.id)).toEqual([stablePaneId]);
  expect(snapshot?.activePaneId).toBe(stablePaneId);
  expect(snapshot?.layout).toMatchObject({ type: 'pane', paneId: stablePaneId });
});

test('restoreLayoutSnapshot removes orphan layout nodes and selects a persisted pane', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();
  await layoutStore.initLayout();

  const snapshot = layoutStore.getLayoutSnapshot()!;
  const persistedPaneId = snapshot.panes[0]!.id;
  const orphanPaneId = 'orphan-pane';
  snapshot.activePaneId = orphanPaneId;
  snapshot.layout = {
    type: 'split',
    id: 'split',
    orientation: 'horizontal',
    sizes: [50, 50],
    children: [snapshot.layout!, { type: 'pane', id: orphanPaneId, paneId: orphanPaneId }],
  };

  await layoutStore.restoreLayoutSnapshot(snapshot);

  expect(paneStore.activePaneId).toBe(persistedPaneId);
  expect(layoutStore.layout).toMatchObject({ type: 'pane', paneId: persistedPaneId });
});

test('getLayoutSnapshot returns a reset snapshot when no persistent panes exist', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();
  await layoutStore.initLayout();

  const paneId = paneStore.activePaneId!;
  const pane = paneStore.panes[paneId]!;
  const tab = Object.values(pane.value.tabs.value)[0]!;
  tab.router.currentRoute.value.name = RouteNames.Embedded;

  const snapshot = layoutStore.getLayoutSnapshot();

  expect(snapshot?.panes).toEqual([]);
  expect(snapshot?.activePaneId).toBe('');
});

test('should auto-init layout during restore if snapshot has no panes', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  const emptySnapshot: LayoutSnapshot = {
    panes: [],
    activePaneId: '',
    timestamp: Date.now(),
    layout: { type: 'pane', id: '1', paneId: '1' },
  };

  await layoutStore.restoreLayoutSnapshot(emptySnapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  expect(paneStore.activePaneId).toBeTruthy();
});
