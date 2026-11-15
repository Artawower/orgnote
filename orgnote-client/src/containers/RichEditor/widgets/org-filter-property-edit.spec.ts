import { afterEach, beforeEach, expect, test } from 'vitest';
import { EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { NodeType, parse } from 'org-mode-ast';
import { orgNodeGetterFacet } from '../facets';
import { readOnlyTransactionFilter } from './org-filter-property-edit';
import { OrgMultilineWidget } from './org-multiline-widget';

const DOC = ':PROPERTIES:\n:type: note\n:END:\n';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

const createEditor = () => {
  const root = parse(DOC);
  const drawer = root.childrenList.find((node) => node.is(NodeType.PropertyDrawer))!;
  const view = new EditorView({
    state: EditorState.create({
      doc: DOC,
      extensions: [orgNodeGetterFacet.of(() => root), readOnlyTransactionFilter],
    }),
    parent: container,
  });
  return { drawer, view };
};

const replaceDrawer = (view: EditorView): void => {
  view.dispatch({
    changes: { from: 0, to: DOC.length - 1, insert: ':PROPERTIES:\n:END:' },
    annotations: Transaction.userEvent.of('input'),
  });
};

test('property edit filter blocks direct page drawer replacement', () => {
  const { view } = createEditor();

  replaceDrawer(view);

  expect(view.state.doc.toString()).toBe(DOC);
  view.destroy();
});

test('property edit filter allows explicit raw page drawer edits', () => {
  const { drawer, view } = createEditor();
  OrgMultilineWidget.requestRawEdit(drawer);

  replaceDrawer(view);

  expect(view.state.doc.toString()).toBe(':PROPERTIES:\n:END:\n');
  OrgMultilineWidget.clearRawEditRequest(drawer);
  view.destroy();
});
