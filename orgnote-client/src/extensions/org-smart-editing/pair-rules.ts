import type { EditorView } from '@codemirror/view';
import { NodeType, walkTree, type OrgNode } from 'org-mode-ast';

export interface PairConfig {
  open: string;
  close: string;
  checkNotLineStart?: boolean;
  nodeType?: NodeType;
}

export const PAIRS: PairConfig[] = [
  { open: '*', close: '*', checkNotLineStart: true, nodeType: NodeType.Bold },
  { open: '/', close: '/', nodeType: NodeType.Italic },
  { open: '=', close: '=', nodeType: NodeType.Verbatim },
  { open: '~', close: '~', nodeType: NodeType.InlineCode },
  { open: '+', close: '+', nodeType: NodeType.Crossed },
  { open: '[', close: ']' },
];

const BLOCK_TYPES = [
  NodeType.SrcBlock,
  NodeType.LatexEnvironment,
  NodeType.LatexFragment,
  NodeType.ExportBlock,
  NodeType.ExampleBlock,
  NodeType.HtmlBlock,
  NodeType.InlineHtml,
  NodeType.BlockBody,
];

const VERBATIM_TYPES = [NodeType.Verbatim, NodeType.InlineCode];

export const findPairByOpen = (char: string): PairConfig | undefined =>
  PAIRS.find((p) => p.open === char);

export const isAtLineStart = (view: EditorView, pos: number): boolean => {
  const line = view.state.doc.lineAt(pos);
  const textBeforeCursor = view.state.doc.sliceString(line.from, pos);
  return textBeforeCursor.trim().length === 0;
};

export const isEscaped = (view: EditorView, pos: number): boolean => {
  if (pos === 0) return false;
  return view.state.doc.sliceString(pos - 1, pos) === '\\';
};

export const hasSpaceOrLineStartBefore = (view: EditorView, pos: number): boolean => {
  const line = view.state.doc.lineAt(pos);
  if (pos === line.from) return true;

  const charBefore = view.state.doc.sliceString(pos - 1, pos);
  return /\s/.test(charBefore);
};

export const isInsideNodeTypes = (
  orgNode: OrgNode | null,
  pos: number,
  nodeTypes: NodeType[],
): boolean => {
  if (!orgNode) return false;

  let inside = false;

  walkTree(orgNode, (node) => {
    if (inside) return true;

    const matches = nodeTypes.some((t) => node.is(t));
    if (matches && pos > node.start && pos < node.end) {
      inside = true;
      return true;
    }
    return false;
  });

  return inside;
};

export const isInsideBlock = (orgNode: OrgNode | null, pos: number): boolean =>
  isInsideNodeTypes(orgNode, pos, BLOCK_TYPES);

export const isInsideVerbatim = (orgNode: OrgNode | null, pos: number): boolean =>
  isInsideNodeTypes(orgNode, pos, VERBATIM_TYPES);

export const isInsideMarkup = (
  orgNode: OrgNode | null,
  pos: number,
  pair: PairConfig,
): boolean => {
  if (!pair.nodeType) return false;
  return isInsideNodeTypes(orgNode, pos, [pair.nodeType]);
};
