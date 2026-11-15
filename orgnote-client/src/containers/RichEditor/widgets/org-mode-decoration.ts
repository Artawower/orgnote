import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import type { MultilineEmbeddedWidgets } from 'orgnote-api';
import { buildInlineWidgetDecorations } from 'src/utils/org-editor/widgets/build-inline-widget-decorations';
import { findHighestPriorityWidget } from 'src/utils/org-editor/widgets/find-highest-priority-widget';
import {
  inlineWidgetsFacet,
  multilineWidgetsFacet,
  orgNodeGetterFacet,
  readonlyFacet,
} from '../facets';

const isInsideBlockWidget = (n: OrgNode, multilineWidgets: MultilineEmbeddedWidgets): boolean => {
  let parent = n.parent;
  while (parent) {
    const widgetList = multilineWidgets[parent.type];
    if (findHighestPriorityWidget(widgetList, parent)) return true;
    parent = parent.parent;
  }
  return false;
};

export const orgInlineWidgets = ViewPlugin.fromClass(
  class {
    public decorations: DecorationSet = Decoration.none;
    private lastPosition = 0;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    private build(view: EditorView): DecorationSet {
      const getRootNode = view.state.facet(orgNodeGetterFacet);
      const readonly = view.state.facet(readonlyFacet);
      const inlineWidgets = view.state.facet(inlineWidgetsFacet);
      const multilineWidgets = view.state.facet(multilineWidgetsFacet);

      const orgNode = getRootNode();
      if (!orgNode) return Decoration.none;

      return buildInlineWidgetDecorations({
        view,
        orgNode,
        inlineWidgets,
        getRootNode,
        readonly,
        shouldSkipNode: (n) => isInsideBlockWidget(n, multilineWidgets),
      });
    }

    public update(update: ViewUpdate): void {
      const current = update.state.selection.main;
      const previous = update.startState.selection.main;
      const caretPositionChanged = this.lastPosition !== current.head;
      this.lastPosition = current.head;

      const selectionStarted = previous.empty && !current.empty;
      const selectionJustCollapsed = !previous.empty && current.empty;

      const readonly = update.state.facet(readonlyFacet);
      const shouldRebuildForCaret =
        !readonly && current.empty && (caretPositionChanged || selectionJustCollapsed);

      const facetsReconfigured = update.transactions.some((tr) => tr.reconfigured);

      if (
        update.docChanged ||
        update.viewportChanged ||
        update.focusChanged ||
        facetsReconfigured ||
        shouldRebuildForCaret ||
        (!readonly && selectionStarted)
      ) {
        this.decorations = this.build(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => {
        return view.plugin(plugin)?.decorations ?? Decoration.none;
      }),
  },
);
