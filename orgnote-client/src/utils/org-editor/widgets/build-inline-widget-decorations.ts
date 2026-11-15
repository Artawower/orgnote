import { Decoration } from '@codemirror/view';
import type { DecorationSet, EditorView } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { walkTree } from 'org-mode-ast';
import type { OrgNode } from 'org-mode-ast';
import type { InlineEmbeddedWidget, InlineEmbeddedWidgets } from 'orgnote-api';
import { OrgInlineWidget } from './org-inline-widget';
import { findHighestPriorityWidget } from './find-highest-priority-widget';

const isNodeOnActiveLine = (view: EditorView, node: OrgNode, caretPosition: number): boolean => {
  const activeLine = view.state.doc.lineAt(caretPosition);
  const clampedStart = Math.min(node.start, view.state.doc.length);
  const nodeLine = view.state.doc.lineAt(clampedStart);
  return activeLine.number === nodeLine.number;
};

export interface BuildInlineWidgetDecorationsOptions {
  view: EditorView;
  orgNode: OrgNode;
  inlineWidgets: InlineEmbeddedWidgets;
  getRootNode: () => OrgNode | null;
  readonly: boolean;
  shouldSkipNode?: (n: OrgNode) => boolean;
}

const prunesChildrenOnReplace = (widget: InlineEmbeddedWidget): boolean =>
  widget.decorationType === 'replace';

export const buildInlineWidgetDecorations = ({
  view,
  orgNode,
  inlineWidgets,
  getRootNode,
  readonly,
  shouldSkipNode,
}: BuildInlineWidgetDecorationsOptions): DecorationSet => {
  const atomicDecorations: Range<Decoration>[] = [];
  const caretPosition = view.state.selection.main.head;

  const visibleRanges = view.visibleRanges;
  const first = visibleRanges[0];
  const last = visibleRanges[visibleRanges.length - 1];
  if (!first || !last) return Decoration.none;
  const visibleStart = first.from;
  const visibleEnd = last.to;

  walkTree(orgNode, (n: OrgNode): boolean => {
    if (n.start > visibleEnd) return true;
    if (n.start < visibleStart) return false;

    const widgetList = inlineWidgets[n.type];
    const inlineWidget = findHighestPriorityWidget(widgetList, n);
    if (!inlineWidget) return false;
    if (shouldSkipNode?.(n)) return false;

    const [startOffset, endOffset] = inlineWidget.showRangeOffset ?? [0, 0];

    if (
      !readonly &&
      view.hasFocus &&
      inlineWidget.hideOnActiveLine &&
      isNodeOnActiveLine(view, n, caretPosition)
    ) {
      return false;
    }

    if (
      !readonly &&
      view.hasFocus &&
      !inlineWidget.ignoreEditing &&
      caretPosition >= n.start - startOffset &&
      caretPosition <= n.end + endOffset
    ) {
      return false;
    }

    const decoration = OrgInlineWidget.init(view, n, inlineWidget, getRootNode, readonly);

    if (decoration) {
      atomicDecorations.push(decoration);
      return prunesChildrenOnReplace(inlineWidget);
    }

    return false;
  });

  return Decoration.set(atomicDecorations);
};
