import type { Command, OrgNoteApi, LayoutSplitNode, LayoutNode } from 'orgnote-api';
import { DefaultCommands, I18N, TABS_COMMAND_GROUP } from 'orgnote-api';

const RESIZE_STEP_PERCENT = 5;
const MIN_PANE_SIZE_PERCENT = 25;

type ResizeDirection = 'left' | 'right' | 'up' | 'down';
type SplitOrientation = 'horizontal' | 'vertical';

const containsPane = (node: LayoutNode, paneId: string): boolean => {
  if (node.type === 'pane') {
    return node.paneId === paneId;
  }
  return node.children.some((child) => containsPane(child, paneId));
};

const findSplitForResize = (
  node: LayoutNode,
  paneId: string,
  targetOrientation: SplitOrientation,
  ancestors: { node: LayoutSplitNode; childIndex: number }[] = [],
): { node: LayoutSplitNode; childIndex: number } | undefined => {
  if (node.type !== 'split') return;

  const childIndex = node.children.findIndex((child) => containsPane(child, paneId));
  if (childIndex === -1) return;

  const currentAncestor = { node, childIndex };
  const newAncestors = [...ancestors, currentAncestor];

  const child = node.children[childIndex];
  if (child && child.type === 'split') {
    const deeper = findSplitForResize(child, paneId, targetOrientation, newAncestors);
    if (deeper) return deeper;
  }

  if (node.orientation === targetOrientation) {
    return currentAncestor;
  }

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (ancestor && ancestor.node.orientation === targetOrientation) {
      return ancestor;
    }
  }
};

const findSplitNodeForDirection = (
  api: OrgNoteApi,
  direction: ResizeDirection,
): { node: LayoutSplitNode; childIndex: number } | undefined => {
  const layoutStore = api.core.useLayout();
  const paneStore = api.core.usePane();

  const activePaneId = paneStore.activePaneId;
  if (!activePaneId) return;

  const layout = layoutStore.layout;
  if (!layout || layout.type !== 'split') return;

  const isHorizontalResize = direction === 'left' || direction === 'right';
  const targetOrientation: SplitOrientation = isHorizontalResize ? 'horizontal' : 'vertical';

  return findSplitForResize(layout, activePaneId, targetOrientation);
};

const clampSizes = (leftSize: number, rightSize: number): [number, number] => {
  const total = leftSize + rightSize;

  if (leftSize < MIN_PANE_SIZE_PERCENT) {
    return [MIN_PANE_SIZE_PERCENT, total - MIN_PANE_SIZE_PERCENT];
  }

  if (rightSize < MIN_PANE_SIZE_PERCENT) {
    return [total - MIN_PANE_SIZE_PERCENT, MIN_PANE_SIZE_PERCENT];
  }

  return [leftSize, rightSize];
};

const getResizeIndices = (
  childIndex: number,
  sizesLength: number,
  isDecreaseDirection: boolean,
): { leftIndex: number; rightIndex: number } | undefined => {
  if (isDecreaseDirection) {
    if (childIndex <= 0) return;
    return { leftIndex: childIndex - 1, rightIndex: childIndex };
  }

  if (childIndex >= sizesLength - 1) return;
  return { leftIndex: childIndex, rightIndex: childIndex + 1 };
};

const calculateNewSizes = (
  sizes: number[],
  leftIndex: number,
  rightIndex: number,
  delta: number,
): number[] => {
  const newSizes = [...sizes];

  let newLeftSize = (sizes[leftIndex] ?? 50) + delta;
  let newRightSize = (sizes[rightIndex] ?? 50) - delta;

  [newLeftSize, newRightSize] = clampSizes(newLeftSize, newRightSize);

  newSizes[leftIndex] = newLeftSize;
  newSizes[rightIndex] = newRightSize;

  return newSizes;
};

const applyResize = (api: OrgNoteApi, direction: ResizeDirection): void => {
  const result = findSplitNodeForDirection(api, direction);
  if (!result) return;

  const { node, childIndex } = result;
  const layoutStore = api.core.useLayout();

  const sizes = layoutStore.normalizeSizes(node.sizes ?? [50, 50]);
  const isDecreaseDirection = direction === 'left' || direction === 'up';

  const indices = getResizeIndices(childIndex, sizes.length, isDecreaseDirection);
  if (!indices) return;

  const delta = isDecreaseDirection ? -RESIZE_STEP_PERCENT : RESIZE_STEP_PERCENT;
  const newSizes = calculateNewSizes(sizes, indices.leftIndex, indices.rightIndex, delta);

  layoutStore.updateNodeSizes(node.id, newSizes);
};

const isResizeAvailable = (api: OrgNoteApi): boolean => {
  const layoutStore = api.core.useLayout();
  const layout = layoutStore.layout;
  return layout?.type === 'split' && layout.children.length > 1;
};

export function getPaneCommands(): Command[] {
  return [
    {
      command: DefaultCommands.RESIZE_PANE_LEFT,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_arrow_back',
      title: I18N.RESIZE_PANE_LEFT,
      handler: (api: OrgNoteApi) => applyResize(api, 'left'),
      hide: (api: OrgNoteApi) => !isResizeAvailable(api),
    },
    {
      command: DefaultCommands.RESIZE_PANE_RIGHT,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_arrow_forward',
      title: I18N.RESIZE_PANE_RIGHT,
      handler: (api: OrgNoteApi) => applyResize(api, 'right'),
      hide: (api: OrgNoteApi) => !isResizeAvailable(api),
    },
    {
      command: DefaultCommands.RESIZE_PANE_UP,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_arrow_upward',
      title: I18N.RESIZE_PANE_UP,
      handler: (api: OrgNoteApi) => applyResize(api, 'up'),
      hide: (api: OrgNoteApi) => !isResizeAvailable(api),
    },
    {
      command: DefaultCommands.RESIZE_PANE_DOWN,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_arrow_downward',
      title: I18N.RESIZE_PANE_DOWN,
      handler: (api: OrgNoteApi) => applyResize(api, 'down'),
      hide: (api: OrgNoteApi) => !isResizeAvailable(api),
    },
  ];
}
