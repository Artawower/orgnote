import type { LayoutNode, LayoutPaneNode } from 'orgnote-api';

const findFirstPane = (node: LayoutNode): LayoutPaneNode | undefined => {
  if (node.type === 'pane') return node;

  for (const child of node.children) {
    const pane = findFirstPane(child);
    if (pane) return pane;
  }

  return undefined;
};

const findAdjacentPane = (node: LayoutNode, paneId: string): LayoutPaneNode | undefined => {
  if (node.type === 'pane') return undefined;

  const targetIndex = node.children.findIndex(
    (child) => child.type === 'pane' && child.paneId === paneId,
  );

  if (targetIndex !== -1) {
    const sibling = node.children.find((_, index) => index !== targetIndex);
    return sibling ? findFirstPane(sibling) : undefined;
  }

  for (const child of node.children) {
    const adjacentPane = findAdjacentPane(child, paneId);
    if (adjacentPane) return adjacentPane;
  }

  return undefined;
};

export const getAdjacentPaneId = (layout?: LayoutNode, paneId?: string): string | undefined => {
  if (!layout || !paneId) return undefined;
  return findAdjacentPane(layout, paneId)?.paneId;
};
