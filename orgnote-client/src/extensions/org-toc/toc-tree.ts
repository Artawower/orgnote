export interface TocTreeNode extends Record<string, unknown> {
  id: string;
  label: string;
  position: number;
  endPosition: number;
  level: number;
  children?: TocTreeNode[];
}
