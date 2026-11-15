import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { InlineEmbeddedWidgets } from 'orgnote-api';
import type { OrgNode } from 'org-mode-ast';
import { buildInlineWidgetDecorations } from '../widgets/build-inline-widget-decorations';

export interface StandaloneInlineWidgetsOptions {
  getOrgNode: () => OrgNode | null;
  getWidgets: () => InlineEmbeddedWidgets;
  readonly?: boolean;
}

export const createStandaloneInlineWidgetsPlugin = (opts: StandaloneInlineWidgetsOptions) => {
  const { getOrgNode, getWidgets, readonly = false } = opts;

  return ViewPlugin.fromClass(
    class {
      public decorations: DecorationSet = Decoration.none;
      private lastCaretPosition = 0;
      private prevOrgNodeNull = true;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      private build(view: EditorView): DecorationSet {
        const orgNode = getOrgNode();
        if (!orgNode) return Decoration.none;

        return buildInlineWidgetDecorations({
          view,
          orgNode,
          inlineWidgets: getWidgets(),
          getRootNode: getOrgNode,
          readonly,
        });
      }

      public update(update: ViewUpdate): void {
        const current = update.state.selection.main;
        const previous = update.startState.selection.main;
        const caretPositionChanged = this.lastCaretPosition !== current.head;
        this.lastCaretPosition = current.head;

        const orgNodeJustArrived = this.prevOrgNodeNull && !!getOrgNode();
        this.prevOrgNodeNull = !getOrgNode();

        const selectionStarted = previous.empty && !current.empty;
        const selectionJustCollapsed = !previous.empty && current.empty;

        const shouldRebuildForCaret =
          !readonly && current.empty && (caretPositionChanged || selectionJustCollapsed);

        if (
          update.docChanged ||
          update.viewportChanged ||
          update.focusChanged ||
          orgNodeJustArrived ||
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
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );
};
