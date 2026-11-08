import { EditorState, type TransactionSpec } from '@codemirror/state';
import { expect, test, vi } from 'vitest';
import {
  EMBEDDED_WIDGET_DIRECTION,
  getEmbeddedWidgetBridge,
} from 'src/utils/org-editor/embedded-widget-runtime';
import {
  deleteTitleSeparatorFromEditor,
  focusEmbeddedWidgetFromEditor,
} from './keyword-navigation';

const createMutableEditorView = (doc: string, anchor: number) => {
  let state = EditorState.create({ doc, selection: { anchor } });
  return {
    get state() {
      return state;
    },
    dispatch: vi.fn((spec: TransactionSpec) => {
      state = state.update(spec).state;
    }),
    focus: vi.fn(),
  };
};

test('focusEmbeddedWidgetFromEditor stays bridge-only when no widget is registered', () => {
  const titleLine = '#+TITLE: Some title';
  const documentText = `${titleLine}\n\n:PROPERTIES:\n:ID: test\n:END:\n`;
  const blankLinePosition = `${titleLine}\n`.length;
  const view = createMutableEditorView(documentText, blankLinePosition);

  const focused = focusEmbeddedWidgetFromEditor(view as never, EMBEDDED_WIDGET_DIRECTION.Previous);

  expect(focused).toBe(false);
  expect(view.dispatch).not.toHaveBeenCalled();
  expect(view.focus).not.toHaveBeenCalled();
});

test('focusEmbeddedWidgetFromEditor does not jump to regular text lines', () => {
  const documentText = 'Regular text\n\n:PROPERTIES:\n:ID: test\n:END:\n';
  const blankLinePosition = 'Regular text\n'.length;
  const view = createMutableEditorView(documentText, blankLinePosition);

  const focused = focusEmbeddedWidgetFromEditor(view as never, EMBEDDED_WIDGET_DIRECTION.Previous);

  expect(focused).toBe(false);
  expect(view.dispatch).not.toHaveBeenCalled();
});

const registerTitleBridgeFocusHandle = (view: ReturnType<typeof createMutableEditorView>) => {
  const focus = vi.fn(() => true);
  getEmbeddedWidgetBridge(view as never).register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: '#+TITLE: Some title'.length }),
    focus,
  });
  return focus;
};

test('deleteTitleSeparatorFromEditor removes blank line after a widget and focuses it', () => {
  const titleLine = '#+TITLE: Some title';
  const documentText = `${titleLine}\n\n:PROPERTIES:\n:ID: test\n:END:\n`;
  const blankLinePosition = `${titleLine}\n`.length;
  const view = createMutableEditorView(documentText, blankLinePosition);
  const focus = registerTitleBridgeFocusHandle(view);

  const handled = deleteTitleSeparatorFromEditor(view as never);

  expect(handled).toBe(true);
  expect(view.state.doc.toString()).toBe(`${titleLine}\n:PROPERTIES:\n:ID: test\n:END:\n`);
  expect(view.state.selection.main.head).toBe(titleLine.length);
  expect(focus).toHaveBeenCalledWith({ position: 'end' });
});

test('deleteTitleSeparatorFromEditor keeps widget separated when next line is non-empty', () => {
  const titleLine = '#+TITLE: Some title';
  const documentText = `${titleLine}\n:PROPERTIES:\n:ID: test\n:END:\n`;
  const propertyLinePosition = `${titleLine}\n`.length;
  const view = createMutableEditorView(documentText, propertyLinePosition);
  const focus = registerTitleBridgeFocusHandle(view);

  const handled = deleteTitleSeparatorFromEditor(view as never);

  expect(handled).toBe(true);
  expect(view.state.doc.toString()).toBe(documentText);
  expect(focus).toHaveBeenCalledWith({ position: 'end' });
});
