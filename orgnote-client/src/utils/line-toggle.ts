import type { EditorView } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import { insertTemplate } from './editor-primitives';
import {
  findNodeAtLine,
  getNodePrefixRange,
  isHeadline as isHeadlineNode,
  isBulletListItem,
  isNumericListItem,
  isCheckboxListItem,
  isToggleableNode,
} from './org-ast';

type NodeMatcher = (node: OrgNode) => boolean;

const removePrefix = (view: EditorView, node: OrgNode): void => {
  const { from, to } = getNodePrefixRange(node);
  const lineEnd = view.state.doc.lineAt(node.start).to;
  const newLineEnd = lineEnd - (to - from);

  view.dispatch({
    changes: { from, to, insert: '' },
    selection: { anchor: newLineEnd, head: newLineEnd },
  });
  requestAnimationFrame(() => view.focus());
};

const replacePrefix = (view: EditorView, node: OrgNode, template: string): void => {
  const { from, to } = getNodePrefixRange(node);
  const lineEnd = view.state.doc.lineAt(node.start).to;
  const newLineEnd = lineEnd - (to - from) + template.length;

  view.dispatch({
    changes: { from, to, insert: template },
    selection: { anchor: newLineEnd, head: newLineEnd },
  });
  requestAnimationFrame(() => view.focus());
};

export const createLineToggle = (view: EditorView, orgNode: OrgNode | undefined) =>
  (template: string, isMatch: NodeMatcher): void => {
    const lineStart = view.state.doc.lineAt(view.state.selection.main.head).from;
    const node = findNodeAtLine(orgNode, lineStart);

    if (!node) {
      insertTemplate(view, { template, prependToLine: true });
      return;
    }

    if (isMatch(node)) {
      removePrefix(view, node);
      return;
    }

    if (isToggleableNode(node)) {
      replacePrefix(view, node, template);
      return;
    }

    insertTemplate(view, { template, prependToLine: true });
  };

export const isHeadline = isHeadlineNode;

export const isBulletList = isBulletListItem;

export const isNumericList = isNumericListItem;

export const isCheckboxList = isCheckboxListItem;
