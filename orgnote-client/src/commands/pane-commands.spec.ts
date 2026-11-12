import { test, expect, vi, beforeEach } from 'vitest';
import { getPaneCommands } from './pane-commands';
import type { OrgNoteApi, LayoutSplitNode, LayoutPaneNode } from 'orgnote-api';
import { DefaultCommands } from 'orgnote-api';

const createMockApi = (layout?: LayoutSplitNode, activePaneId?: string): OrgNoteApi => {
  const mockLayoutStore = {
    layout,
    normalizeSizes: vi.fn((sizes: number[]) => sizes),
    updateNodeSizes: vi.fn(),
  };

  const mockPaneStore = {
    activePaneId,
  };

  return {
    core: {
      useLayout: () => mockLayoutStore,
      usePane: () => mockPaneStore,
    },
  } as unknown as OrgNoteApi;
};

const createSplitLayout = (
  orientation: 'horizontal' | 'vertical',
  paneIds: string[],
  sizes?: number[],
): LayoutSplitNode => ({
  type: 'split',
  id: 'split-1',
  orientation,
  children: paneIds.map(
    (paneId): LayoutPaneNode => ({
      type: 'pane',
      id: `node-${paneId}`,
      paneId,
    }),
  ),
  sizes: sizes ?? paneIds.map(() => 100 / paneIds.length),
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('getPaneCommands returns four resize commands', () => {
  const commands = getPaneCommands();

  expect(commands).toHaveLength(4);
  expect(commands.map((c) => c.command)).toEqual([
    DefaultCommands.RESIZE_PANE_LEFT,
    DefaultCommands.RESIZE_PANE_RIGHT,
    DefaultCommands.RESIZE_PANE_UP,
    DefaultCommands.RESIZE_PANE_DOWN,
  ]);
});

test('RESIZE_PANE_RIGHT increases left pane size in horizontal split', () => {
  const layout = createSplitLayout('horizontal', ['pane-1', 'pane-2'], [50, 50]);
  const api = createMockApi(layout, 'pane-1');

  const command = getPaneCommands().find((c) => c.command === DefaultCommands.RESIZE_PANE_RIGHT);
  command?.handler(api, { data: undefined, meta: {} });

  const layoutStore = api.core.useLayout();
  expect(layoutStore.updateNodeSizes).toHaveBeenCalledWith('split-1', [55, 45]);
});

test('RESIZE_PANE_LEFT moves boundary left (requires left neighbor)', () => {
  const layout = createSplitLayout('horizontal', ['pane-1', 'pane-2'], [50, 50]);
  const api = createMockApi(layout, 'pane-2');

  const command = getPaneCommands().find((c) => c.command === DefaultCommands.RESIZE_PANE_LEFT);
  command?.handler(api, { data: undefined, meta: {} });

  const layoutStore = api.core.useLayout();
  expect(layoutStore.updateNodeSizes).toHaveBeenCalledWith('split-1', [45, 55]);
});

test('RESIZE_PANE_DOWN increases top pane size in vertical split', () => {
  const layout = createSplitLayout('vertical', ['pane-1', 'pane-2'], [50, 50]);
  const api = createMockApi(layout, 'pane-1');

  const command = getPaneCommands().find((c) => c.command === DefaultCommands.RESIZE_PANE_DOWN);
  command?.handler(api, { data: undefined, meta: {} });

  const layoutStore = api.core.useLayout();
  expect(layoutStore.updateNodeSizes).toHaveBeenCalledWith('split-1', [55, 45]);
});

test('RESIZE_PANE_UP moves boundary up (requires top neighbor)', () => {
  const layout = createSplitLayout('vertical', ['pane-1', 'pane-2'], [50, 50]);
  const api = createMockApi(layout, 'pane-2');

  const command = getPaneCommands().find((c) => c.command === DefaultCommands.RESIZE_PANE_UP);
  command?.handler(api, { data: undefined, meta: {} });

  const layoutStore = api.core.useLayout();
  expect(layoutStore.updateNodeSizes).toHaveBeenCalledWith('split-1', [45, 55]);
});

test('resize commands are hidden when no split layout exists', () => {
  const api = createMockApi(undefined, 'pane-1');

  const command = getPaneCommands().find((c) => c.command === DefaultCommands.RESIZE_PANE_RIGHT);
  const isHidden = command?.hide?.(api);

  expect(isHidden).toBe(true);
});

test('resize respects minimum pane size of 25%', () => {
  const layout = createSplitLayout('horizontal', ['pane-1', 'pane-2'], [30, 70]);
  const api = createMockApi(layout, 'pane-2');

  const command = getPaneCommands().find((c) => c.command === DefaultCommands.RESIZE_PANE_LEFT);
  command?.handler(api, { data: undefined, meta: {} });

  const layoutStore = api.core.useLayout();
  expect(layoutStore.updateNodeSizes).toHaveBeenCalledWith('split-1', [25, 75]);
});

test('horizontal resize does nothing on vertical split', () => {
  const layout = createSplitLayout('vertical', ['pane-1', 'pane-2'], [50, 50]);
  const api = createMockApi(layout, 'pane-1');

  const command = getPaneCommands().find((c) => c.command === DefaultCommands.RESIZE_PANE_RIGHT);
  command?.handler(api, { data: undefined, meta: {} });

  const layoutStore = api.core.useLayout();
  expect(layoutStore.updateNodeSizes).not.toHaveBeenCalled();
});

test('vertical resize does nothing on horizontal split', () => {
  const layout = createSplitLayout('horizontal', ['pane-1', 'pane-2'], [50, 50]);
  const api = createMockApi(layout, 'pane-1');

  const command = getPaneCommands().find((c) => c.command === DefaultCommands.RESIZE_PANE_DOWN);
  command?.handler(api, { data: undefined, meta: {} });

  const layoutStore = api.core.useLayout();
  expect(layoutStore.updateNodeSizes).not.toHaveBeenCalled();
});
