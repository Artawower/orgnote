export type LayoutOrientation = 'horizontal' | 'vertical';

export type DropZone = 'left' | 'right' | 'top' | 'bottom' | 'center';

export type DropDirection = 'left' | 'right' | 'top' | 'bottom';

export type HorizontalPosition = 'left' | 'right' | 'center';
export type VerticalPosition = 'top' | 'bottom' | 'center';

export interface PanePosition {
  horizontal: HorizontalPosition;
  vertical: VerticalPosition;
}

export type LayoutNode = LayoutPaneNode | LayoutSplitNode;

export interface LayoutPaneNode {
  type: 'pane';
  id: string;
  paneId: string;
}

export interface LayoutSplitNode {
  type: 'split';
  id: string;
  orientation: LayoutOrientation;
  children: LayoutNode[];
  sizes?: number[];
}
