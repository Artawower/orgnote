import { EditorState, type TransactionSpec } from '@codemirror/state';
import { parse } from 'org-mode-ast';
import { expect, test, vi } from 'vitest';
import type { OrgNoteApi } from 'orgnote-api';
import { getEmbeddedWidgetBridge } from 'src/utils/org-editor/embedded-widget-runtime';
import { titleWidgetId } from 'src/extensions/org-keyword-overlay/title-widget-id';
import { ADD_TITLE_COMMAND, addTitleToEditor, createAddTitleCommand } from './title-command';

const createMutableEditorView = (doc: string) => {
  let state = EditorState.create({ doc });
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

const registerTitleFocus = (view: ReturnType<typeof createMutableEditorView>, nodeStart: number) => {
  const focus = vi.fn(() => true);
  getEmbeddedWidgetBridge(view as never).register({
    id: titleWidgetId(nodeStart),
    getRange: () => ({ from: nodeStart, to: nodeStart + '#+TITLE: '.length }),
    focus,
  });
  return focus;
};

test('addTitleToEditor inserts title at the beginning and leaves focus to mounted title widget', () => {
  const view = createMutableEditorView('* Heading\nBody');

  addTitleToEditor(view as never, parse(view.state.doc.toString()));

  expect(view.state.doc.toString()).toBe('#+TITLE: \n* Heading\nBody');
  expect(view.state.selection.main.head).toBe('#+TITLE: '.length);
  expect(view.focus).toHaveBeenCalledOnce();
});

test('addTitleToEditor inserts title without trailing newline in an empty document', () => {
  const view = createMutableEditorView('');

  addTitleToEditor(view as never, parse(view.state.doc.toString()));

  expect(view.state.doc.toString()).toBe('#+TITLE: ');
  expect(view.state.selection.main.head).toBe('#+TITLE: '.length);
});

test('addTitleToEditor inserts title after root property drawer', () => {
  const doc = ':PROPERTIES:\n:ID: note-id\n:END:\nBody';
  const view = createMutableEditorView(doc);

  addTitleToEditor(view as never, parse(doc));

  const expected = ':PROPERTIES:\n:ID: note-id\n:END:\n#+TITLE: \nBody';
  expect(view.state.doc.toString()).toBe(expected);
  expect(view.state.selection.main.head).toBe(':PROPERTIES:\n:ID: note-id\n:END:\n#+TITLE: '.length);
});

test('addTitleToEditor separates title from root property drawer at document end', () => {
  const doc = ':PROPERTIES:\n:ID: note-id\n:END:';
  const view = createMutableEditorView(doc);

  addTitleToEditor(view as never, parse(doc));

  const expected = ':PROPERTIES:\n:ID: note-id\n:END:\n#+TITLE: ';
  expect(view.state.doc.toString()).toBe(expected);
  expect(view.state.selection.main.head).toBe(expected.length);
});

test('addTitleToEditor focuses an existing mounted title instead of duplicating it', () => {
  const doc = '#+TITLE: Existing\n* Heading';
  const view = createMutableEditorView(doc);
  const focus = registerTitleFocus(view, 0);

  addTitleToEditor(view as never, parse(doc));

  expect(view.state.doc.toString()).toBe(doc);
  expect(view.state.selection.main.head).toBe('#+TITLE: Existing'.length);
  expect(focus).toHaveBeenCalledWith({ position: 'end' });
});

test('createAddTitleCommand reads active editor context', () => {
  const view = createMutableEditorView('Body');
  const command = createAddTitleCommand();
  const useEditor = vi.fn(() => ({
    activeContext: {
      editorViewGetter: () => view,
      orgNode: parse(view.state.doc.toString()),
    },
  }));
  const api = { core: { useEditor } } as unknown as OrgNoteApi;

  command.handler(api, { meta: command });

  expect(command.command).toBe(ADD_TITLE_COMMAND);
  expect(view.state.doc.toString()).toBe('#+TITLE: \nBody');
});
