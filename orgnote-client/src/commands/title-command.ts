import type { Command, OrgNoteApi } from 'orgnote-api';
import { EDITOR_COMMAND_GROUP } from 'orgnote-api';
import type { EditorView } from '@codemirror/view';
import { NodeType, type OrgNode } from 'org-mode-ast';
import {
  EMBEDDED_WIDGET_COMMAND,
  getEmbeddedWidgetBridge,
} from 'src/utils/org-editor/embedded-widget-runtime';
import {
  getPropertyWidgetRange,
  isRootPropertySequenceStart,
} from 'src/extensions/org-property-drawer/property-source';
import { titleWidgetId } from 'src/extensions/org-keyword-overlay/title-widget-id';
import { getKeywordName } from 'src/extensions/org-keyword-overlay/utils';

export const ADD_TITLE_COMMAND = 'editor.add-title';
const TITLE_TEMPLATE = '#+TITLE: ';
const TITLE_CURSOR_OFFSET = TITLE_TEMPLATE.length;
const DOCUMENT_START = 0;
const LEADING_NEWLINE_LENGTH = 1;

const getActiveEditorView = (api: OrgNoteApi): EditorView | undefined =>
  api.core.useEditor().activeContext?.editorViewGetter?.();

const titleKeyword = (root: OrgNode | null | undefined): OrgNode | undefined =>
  root?.childrenList.find((node) => getKeywordName(node) === 'title');

const rootPropertyDrawer = (root: OrgNode | null | undefined): OrgNode | undefined =>
  root?.childrenList.find(
    (node) =>
      node.is(NodeType.PropertyDrawer) ||
      (node.is(NodeType.Property) && isRootPropertySequenceStart(node)),
  );

const focusPosition = (view: EditorView, position: number): void => {
  view.dispatch({ selection: { anchor: position, head: position }, scrollIntoView: true });
  view.focus();
};

const focusTitleWidget = (view: EditorView, nodeStart: number): void => {
  getEmbeddedWidgetBridge(view).dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Focus,
    payload: {
      id: titleWidgetId(nodeStart),
      position: 'end',
    },
  });
};

interface TitleInsertion {
  readonly from: number;
  readonly insert: string;
  readonly titleStart: number;
}

const titleInsertAtDocumentStart = (view: EditorView): TitleInsertion => ({
  from: DOCUMENT_START,
  insert: view.state.doc.length > 0 ? `${TITLE_TEMPLATE}\n` : TITLE_TEMPLATE,
  titleStart: DOCUMENT_START,
});

const lineAfterPosition = (view: EditorView, position: number): number => {
  const line = view.state.doc.lineAt(position);
  if (line.to >= view.state.doc.length) return line.to;
  return line.to + LEADING_NEWLINE_LENGTH;
};

const titleInsertAfterPropertyDrawer = (
  view: EditorView,
  propertyDrawer: OrgNode,
): TitleInsertion => {
  const range = getPropertyWidgetRange(propertyDrawer);
  const from = lineAfterPosition(view, range.to);
  if (from === range.to) {
    return { from, insert: `\n${TITLE_TEMPLATE}`, titleStart: from + LEADING_NEWLINE_LENGTH };
  }

  return { from, insert: `${TITLE_TEMPLATE}\n`, titleStart: from };
};

const titleInsertion = (view: EditorView, root: OrgNode | null | undefined): TitleInsertion => {
  const propertyDrawer = rootPropertyDrawer(root);
  if (propertyDrawer) return titleInsertAfterPropertyDrawer(view, propertyDrawer);
  return titleInsertAtDocumentStart(view);
};

export const addTitleToEditor = (view: EditorView, root: OrgNode | null | undefined): void => {
  const existingTitle = titleKeyword(root);
  if (existingTitle) {
    focusPosition(view, existingTitle.end);
    focusTitleWidget(view, existingTitle.start);
    return;
  }

  const insertion = titleInsertion(view, root);
  const titleCursorPosition = insertion.titleStart + TITLE_CURSOR_OFFSET;
  view.dispatch({
    changes: { from: insertion.from, to: insertion.from, insert: insertion.insert },
    selection: { anchor: titleCursorPosition, head: titleCursorPosition },
    scrollIntoView: true,
  });
  view.focus();
};

export const createAddTitleCommand = (): Command => ({
  command: ADD_TITLE_COMMAND,
  title: 'Add title',
  icon: 'sym_o_title',
  group: EDITOR_COMMAND_GROUP,
  handler: (api) => {
    const editorStore = api.core.useEditor();
    const view = getActiveEditorView(api);
    if (!view) return;
    addTitleToEditor(view, editorStore.activeContext?.orgNode);
  },
});
