import type { Transaction } from '@codemirror/state';
import { StateField, type EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { Decoration, EditorView } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import { walkTree } from 'org-mode-ast';
import type { MultilineEmbeddedWidget } from 'orgnote-api';
import { findHighestPriorityWidget } from 'src/utils/org-editor/widgets/find-highest-priority-widget';
import { hasIntersection } from 'src/utils/has-intersection';
import { multilineWidgetsFacet, orgNodeGetterFacet, readonlyFacet } from '../facets';
import { OrgMultilineWidget } from './org-multiline-widget';

export const isWidgetConfigChanged = (
  a: MultilineEmbeddedWidget,
  b: MultilineEmbeddedWidget,
): boolean =>
  a.component !== b.component ||
  a.componentProps !== b.componentProps ||
  a.actionsComponent !== b.actionsComponent ||
  a.actionsComponentProps !== b.actionsComponentProps ||
  a.suppressEdit !== b.suppressEdit ||
  a.widgetBuilder !== b.widgetBuilder ||
  a.viewUpdater !== b.viewUpdater ||
  a.rangeBuilder !== b.rangeBuilder ||
  a.editPositionBuilder !== b.editPositionBuilder ||
  a.ignoreEvent !== b.ignoreEvent;

const removeWidgetByNode = (widgets: DecorationSet, orgNode: OrgNode): DecorationSet =>
  widgets.update({
    filter: (from, to, value) => {
      const widget = value.spec.widget as OrgMultilineWidget | undefined;
      return (
        !widget ||
        widget.orgNode.isNot(orgNode.type) ||
        !hasIntersection(from, to, orgNode.start, orgNode.end)
      );
    },
  });

const addOrUpdateWidget = (
  widgets: DecorationSet,
  orgNode: OrgNode,
  rootNodeSrc: () => OrgNode | null,
  multilineWidget: Parameters<typeof OrgMultilineWidget.init>[3],
  editorViewRef: { current: EditorView | null },
  docLength: number,
  readonly: boolean,
): DecorationSet => {
  const { from: start, to: end } = OrgMultilineWidget.getRange(orgNode, multilineWidget, docLength);

  const foundWidget: { current: OrgMultilineWidget | null } = { current: null };

  const withoutExisting = widgets.update({
    filter: (from, to, value) => {
      const widget = value.spec.widget as OrgMultilineWidget | undefined;
      if (!widget || widget.orgNode.isNot(orgNode.type)) return true;

      const isSameNode = widget.sameNodeByOrgNode(orgNode);
      const intersectsNewRange = hasIntersection(from, to, start, end);

      if (!isSameNode && !intersectsNewRange) return true;

      if (isSameNode && !widget.isDestroyed()) foundWidget.current = widget;
      return false;
    },
  });

  if (foundWidget.current && foundWidget.current.getReadonly() !== readonly) {
    foundWidget.current = null;
  }

  if (
    foundWidget.current &&
    isWidgetConfigChanged(foundWidget.current.multilineWidget, multilineWidget)
  ) {
    foundWidget.current = null;
  }

  foundWidget.current?.updateOrgNode(orgNode);

  if (!editorViewRef.current) return withoutExisting;

  const decorationToAdd = foundWidget.current
    ? OrgMultilineWidget.createDecoration(foundWidget.current, orgNode, multilineWidget, docLength)
    : OrgMultilineWidget.init(
        editorViewRef.current,
        orgNode,
        rootNodeSrc,
        multilineWidget,
        docLength,
        readonly,
      );

  return withoutExisting.update({
    add: [decorationToAdd],
  });
};

const isOrgNodeSynced = (state: EditorState, orgNode: OrgNode | null): boolean => {
  if (!orgNode) return false;
  return orgNode.rawValue === state.doc.toString();
};

const buildDecorations = (
  state: EditorState,
  current: DecorationSet,
  editorViewRef: { current: EditorView | null },
): DecorationSet => {
  const getOrgNode = state.facet(orgNodeGetterFacet);
  const readonly = state.facet(readonlyFacet);
  const widgets = state.facet(multilineWidgetsFacet);
  const orgNode = getOrgNode();

  if (!orgNode || !isOrgNodeSynced(state, orgNode)) return current;

  const currentCaretPosition = state.selection.main.head;
  const liveWidgetNodes = new Set<OrgNode>();
  let result = current;

  walkTree(orgNode, (n: OrgNode): boolean => {
    liveWidgetNodes.add(n);
    const widgetList = widgets[n.type];
    const multilineEmbeddedWidget = findHighestPriorityWidget(widgetList, n);

    if (!multilineEmbeddedWidget) return false;

    const { from, to } = OrgMultilineWidget.getRange(n, multilineEmbeddedWidget, state.doc.length);
    const caretIntoWidget = currentCaretPosition >= from && currentCaretPosition <= to + 1;
    const rawEditRequested = OrgMultilineWidget.hasRawEditRequest(n);
    const shouldAutoEdit = !multilineEmbeddedWidget.suppressEdit && caretIntoWidget;
    const shouldRemove = !readonly && ((rawEditRequested && caretIntoWidget) || shouldAutoEdit);

    if (rawEditRequested && !caretIntoWidget) OrgMultilineWidget.clearRawEditRequest(n);

    if (shouldRemove) {
      result = removeWidgetByNode(result, n);
      return false;
    }

    result = addOrUpdateWidget(
      result,
      n,
      getOrgNode,
      multilineEmbeddedWidget,
      editorViewRef,
      state.doc.length,
      readonly,
    );
    return false;
  });

  return pruneStaleWidgets(result, liveWidgetNodes);
};

const pruneStaleWidgets = (
  decorations: DecorationSet,
  liveWidgetNodes: ReadonlySet<OrgNode>,
): DecorationSet =>
  decorations.update({
    filter: (_from, _to, value) => {
      const widget = value.spec.widget as OrgMultilineWidget | undefined;
      if (!widget) return true;
      return liveWidgetNodes.has(widget.orgNode);
    },
  });

const hasSignificantChanges = (tr: Transaction): boolean => {
  if (tr.docChanged) return true;
  if (tr.reconfigured) return true;
  if (tr.state.selection.eq(tr.startState.selection)) return false;

  const current = tr.state.selection.main;
  const previous = tr.startState.selection.main;

  if (!current.empty) return previous.empty;
  return true;
};

export const createMultilineWidgetsField = (editorViewRef: {
  current: EditorView | null;
}): StateField<DecorationSet> =>
  StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state, Decoration.none, editorViewRef),

    update: (decorations, tr) => {
      if (!hasSignificantChanges(tr)) return decorations;

      const mapped = decorations.map(tr.changes);
      return buildDecorations(tr.state, mapped, editorViewRef);
    },

    provide: (field) => EditorView.decorations.from(field),
  });
