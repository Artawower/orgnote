import { EditorState, type TransactionSpec } from '@codemirror/state';
import { expect, test } from 'vitest';
import { parse, type OrgNode } from 'org-mode-ast';
import {
  getPropertyWidgetRange,
  insertEmptyPropertyDrawer,
  isRootPropertySequenceStart,
  replacePropertyItems,
} from './property-source';

const createFakeView = (content: string) => {
  const calls: unknown[] = [];
  return {
    calls,
    view: {
      state: {
        doc: { length: content.length, toString: () => content },
        selection: { main: { head: 0 } },
        changes: () => ({ mapPos: (position: number) => position }),
      },
      dispatch: (transaction: unknown) => calls.push(transaction),
    },
  };
};

const createMutableFakeView = (content: string) => {
  let state = EditorState.create({ doc: content, selection: { anchor: 0 } });
  return {
    get state() {
      return state;
    },
    dispatch: (transaction: TransactionSpec) => {
      state = state.update(transaction).state;
    },
  };
};

const expectNode = (node: OrgNode | undefined): OrgNode => {
  if (!node) throw new Error('Expected org node');
  return node;
};

test('property source detects root property sequence after keywords', () => {
  const root = parse('#+title: X\n:PROPERTIES:\n:type: note\n:END:\n\n* H\n');
  const propertyStart = expectNode(root.childrenList.find((node) => node.rawValue === ':PROPERTIES:'));
  expect(isRootPropertySequenceStart(propertyStart)).toBe(true);
  expect(getPropertyWidgetRange(propertyStart)).toEqual({ from: 11, to: 41 });
});

test('property source replaces current drawer range', () => {
  const root = parse(':PROPERTIES:\n:type: old\n:END:\n');
  const drawer = expectNode(root.childrenList[0]);
  const { calls, view } = createFakeView(root.rawValue);

  replacePropertyItems(view as never, drawer, [{ key: 'type', value: 'new' }]);

  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    changes: { ...getPropertyWidgetRange(drawer), insert: ':PROPERTIES:\n:type: new\n:END:' },
  });
});

test('property source replaces repeated edits without leaving stale source tails', () => {
  const root = parse(':PROPERTIES:\n:ID: old\n:END:\n');
  const drawer = expectNode(root.childrenList[0]);
  const view = createMutableFakeView(root.rawValue);

  replacePropertyItems(view as never, drawer, [{ key: 'ID', value: 'longer-value' }]);
  replacePropertyItems(view as never, drawer, [{ key: 'ID', value: 'next-longer-value' }]);

  expect(view.state.doc.toString()).toBe(':PROPERTIES:\n:ID: next-longer-value\n:END:\n');
});

test('property source reports applied drawer replacement', () => {
  const root = parse(':PROPERTIES:\n:type: old\n:END:\n');
  const drawer = expectNode(root.childrenList[0]);
  const { calls, view } = createFakeView(root.rawValue);
  let applied = false;

  replacePropertyItems(view as never, drawer, [{ key: 'type', value: 'new' }], () => {
    applied = true;
  });

  expect(applied).toBe(true);
  expect(calls).toHaveLength(1);
});

test('property source keeps Enter inside property value on one source line', () => {
  const root = parse(':PROPERTIES:\n:ID: old\n:END:\n');
  const drawer = expectNode(root.childrenList[0]);
  const { calls, view } = createFakeView(root.rawValue);

  replacePropertyItems(view as never, drawer, [{ key: 'ID', value: 'qwe\nND' }]);

  expect(calls[0]).toMatchObject({
    changes: { ...getPropertyWidgetRange(drawer), insert: ':PROPERTIES:\n:ID: qwe ND\n:END:' },
  });
});

test('property source uses current AST range as the replacement boundary', () => {
  const root = parse(':PROPERTIES:\n:ID: SOME_ID\n:END:\n');
  const drawer = expectNode(root.childrenList[0]);
  const currentContent = ':PROPERTIES:\n:ID: SOME_ID123\n:END:\n';
  const { calls, view } = createFakeView(currentContent);

  replacePropertyItems(view as never, drawer, [{ key: 'ID', value: 'SOME_ID1234' }]);

  expect(calls[0]).toMatchObject({
    changes: {
      from: 0,
      to: currentContent.trimEnd().length,
      insert: ':PROPERTIES:\n:ID: SOME_ID1234\n:END:',
    },
  });
});

test('property source follows a page drawer shifted by title edits', () => {
  const root = parse('#+TITLE: X\n:PROPERTIES:\n:ID: old\n:END:\n');
  const drawer = expectNode(root.childrenList[1]);
  const currentContent = '#+TITLE: Longer title\n:PROPERTIES:\n:ID: old\n:END:\n';
  const { calls, view } = createFakeView(currentContent);
  const drawerStart = currentContent.indexOf(':PROPERTIES:');

  replacePropertyItems(view as never, drawer, [{ key: 'ID', value: 'new' }]);

  expect(calls[0]).toMatchObject({
    changes: {
      from: drawerStart,
      to: currentContent.trimEnd().length,
      insert: ':PROPERTIES:\n:ID: new\n:END:',
    },
  });
});

test('property source inserts empty drawer at target position', () => {
  const { calls, view } = createFakeView('* H\n');
  insertEmptyPropertyDrawer(view as never, 0);
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    changes: { from: 0, to: 0, insert: ':PROPERTIES:\n:END:\n' },
  });
});
