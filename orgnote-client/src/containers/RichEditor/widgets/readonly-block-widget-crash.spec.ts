import { afterEach, beforeEach, expect, test } from 'vitest';
import { EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { NodeType, parse, withMetaInfo } from 'org-mode-ast';
import type { InlineEmbeddedWidget, MultilineEmbeddedWidget } from 'orgnote-api';
import {
  orgNodeGetterFacet,
  readonlyFacet,
  inlineWidgetsFacet,
  multilineWidgetsFacet,
} from '../facets';
import { orgInlineWidgets } from './org-mode-decoration';
import { createMultilineWidgetsField } from './multiline-widgets';

const DOC_QUOTE_WITH_ITALIC = '#+begin_quote\n/italic text/\n#+end_quote';

const makeQuoteBlockWidget = (): MultilineEmbeddedWidget => ({
  id: 'test-quote-widget',
  widgetBuilder: ({ wrap }) => {
    wrap.textContent = 'quote';
    return { destroy: () => {} };
  },
});

const makeItalicInlineWidget = (): InlineEmbeddedWidget => ({
  id: 'test-italic-widget',
  decorationType: 'replace',
  ignoreEditing: true,
  widgetBuilder: ({ wrap }) => {
    wrap.textContent = 'italic';
    return { destroy: () => {} };
  },
});

const makeTitleKeywordWidget = (): MultilineEmbeddedWidget => ({
  id: 'test-title-widget',
  suppressEdit: true,
  satisfied: (node) => node.rawValue.startsWith('#+TITLE:'),
  widgetBuilder: ({ wrap }) => {
    wrap.textContent = 'title';
    return { destroy: () => {} };
  },
});

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

const hasDecorationsInRange = (decorations: DecorationSet, from: number, to: number): boolean => {
  let found = false;
  decorations.between(from, to, () => {
    found = true;
  });
  return found;
};

const createReadonlyEditorWithQuoteAndItalicWidgets = () => {
  const orgNode = withMetaInfo(parse(DOC_QUOTE_WITH_ITALIC));
  const editorViewRef = { current: null as EditorView | null };
  const multilineField = createMultilineWidgetsField(editorViewRef);

  const view = new EditorView({
    state: EditorState.create({
      doc: DOC_QUOTE_WITH_ITALIC,
      extensions: [
        readonlyFacet.of(true),
        orgNodeGetterFacet.of(() => orgNode),
        multilineWidgetsFacet.of({ [NodeType.QuoteBlock]: [makeQuoteBlockWidget()] }),
        inlineWidgetsFacet.of({ [NodeType.Italic]: [makeItalicInlineWidget()] }),
        multilineField,
        orgInlineWidgets,
      ],
    }),
    parent: container,
  });

  editorViewRef.current = view;
  return { view, multilineField };
};

test('orgInlineWidgets does not place inline decorations inside block widget ranges in readonly mode', () => {
  const { view } = createReadonlyEditorWithQuoteAndItalicWidgets();
  const inlinePlugin = view.plugin(orgInlineWidgets);
  expect(inlinePlugin).not.toBeNull();
  const inlineDecorations = inlinePlugin!.decorations;

  expect(hasDecorationsInRange(inlineDecorations, 0, DOC_QUOTE_WITH_ITALIC.length)).toBe(false);

  view.destroy();
});

const countDecorationsInRange = (decorations: DecorationSet, from: number, to: number): number => {
  let count = 0;
  decorations.between(from, to, () => {
    count++;
  });
  return count;
};

test('multiline widget field keeps block widget visible when cursor moves inside it in readonly mode', () => {
  const { view, multilineField } = createReadonlyEditorWithQuoteAndItalicWidgets();

  view.dispatch({ selection: { anchor: DOC_QUOTE_WITH_ITALIC.indexOf('/italic text/') } });

  expect(
    countDecorationsInRange(view.state.field(multilineField), 0, DOC_QUOTE_WITH_ITALIC.length),
  ).toBe(1);

  view.destroy();
});

test('multiline widget field preserves mapped widgets while org AST catches up to doc changes', () => {
  const doc = '#+TITLE: Some text';
  const orgNode = withMetaInfo(parse(doc));
  const editorViewRef = { current: null as EditorView | null };
  const multilineField = createMultilineWidgetsField(editorViewRef);

  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        orgNodeGetterFacet.of(() => orgNode),
        multilineWidgetsFacet.of({ [NodeType.Keyword]: [makeTitleKeywordWidget()] }),
        multilineField,
      ],
    }),
    parent: container,
  });

  editorViewRef.current = view;
  view.dispatch({ selection: { anchor: doc.length } });

  expect(countDecorationsInRange(view.state.field(multilineField), 0, doc.length)).toBe(1);

  view.dispatch({
    changes: { from: doc.length, insert: '\n' },
    selection: { anchor: doc.length + 1 },
  });

  expect(countDecorationsInRange(view.state.field(multilineField), 0, doc.length)).toBe(1);

  view.destroy();
});

test('mousedown on multiline widget does not throw RangeError', () => {
  const { view } = createReadonlyEditorWithQuoteAndItalicWidgets();
  // Dispatch a selection change to trigger the first render with editorViewRef set
  view.dispatch({ selection: { anchor: 1 } });

  const widgetEl = container.querySelector('.org-embedded-quote-block');
  expect(widgetEl).not.toBeNull();
  expect(widgetEl!.getAttribute('contenteditable')).toBe('false');

  expect(() => {
    widgetEl!.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }),
    );
  }).not.toThrow();

  view.destroy();
});

test('two identical quote blocks both get decorations when cursor moves', () => {
  const doc = '#+begin_quote\nhello\n#+end_quote\n#+begin_quote\nhello\n#+end_quote';
  const orgNode = withMetaInfo(parse(doc));
  const editorViewRef = { current: null as EditorView | null };
  const multilineField = createMultilineWidgetsField(editorViewRef);

  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        readonlyFacet.of(true),
        orgNodeGetterFacet.of(() => orgNode),
        multilineWidgetsFacet.of({ [NodeType.QuoteBlock]: [makeQuoteBlockWidget()] }),
        multilineField,
      ],
    }),
    parent: container,
  });

  editorViewRef.current = view;

  view.dispatch({ selection: { anchor: 1 } });

  expect(countDecorationsInRange(view.state.field(multilineField), 0, doc.length)).toBe(2);

  view.destroy();
});

test('orgInlineWidgets does not rebuild decorations on cursor movement in readonly mode', () => {
  const doc = '/italic text/';
  const orgNode = withMetaInfo(parse(doc));

  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        readonlyFacet.of(true),
        orgNodeGetterFacet.of(() => orgNode),
        inlineWidgetsFacet.of({ [NodeType.Italic]: [makeItalicInlineWidget()] }),
        orgInlineWidgets,
      ],
    }),
    parent: container,
  });

  const plugin = view.plugin(orgInlineWidgets);
  expect(plugin).not.toBeNull();
  const decorationsBeforeCursorMove = plugin!.decorations;
  expect(decorationsBeforeCursorMove).toBeDefined();
  view.dispatch({ selection: { anchor: doc.indexOf('italic') } });
  const decorationsAfterCursorMove = plugin!.decorations;

  expect(decorationsAfterCursorMove).toBe(decorationsBeforeCursorMove);

  view.destroy();
});

test('multiline widget field prunes a widget whose org node was deleted from the synced tree', () => {
  const doc = '#+TITLE: \nbody';
  let orgNode = withMetaInfo(parse(doc));
  const editorViewRef = { current: null as EditorView | null };
  const multilineField = createMultilineWidgetsField(editorViewRef);

  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        orgNodeGetterFacet.of(() => orgNode),
        multilineWidgetsFacet.of({ [NodeType.Keyword]: [makeTitleKeywordWidget()] }),
        multilineField,
      ],
    }),
    parent: container,
  });
  editorViewRef.current = view;

  view.dispatch({ selection: { anchor: doc.length } });
  expect(countDecorationsInRange(view.state.field(multilineField), 0, doc.length)).toBe(1);

  const firstLineTo = view.state.doc.line(1).to;
  orgNode = withMetaInfo(parse('body'));
  view.dispatch({
    changes: { from: 0, to: firstLineTo + 1 },
    selection: { anchor: 0 },
  });

  expect(view.state.doc.toString()).toBe('body');
  expect(countDecorationsInRange(view.state.field(multilineField), 0, view.state.doc.length)).toBe(
    0,
  );
  view.destroy();
});
