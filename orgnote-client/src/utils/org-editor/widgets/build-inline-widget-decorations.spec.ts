import { expect, test, vi } from 'vitest';
import { Decoration } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { NodeType, type OrgNode } from 'org-mode-ast';
import type { InlineEmbeddedWidgets } from 'orgnote-api';
import { buildInlineWidgetDecorations } from './build-inline-widget-decorations';

const createMockOrgNode = (overrides: Partial<OrgNode> = {}): OrgNode =>
  ({
    start: 0,
    end: 3,
    rawValue: '[ ]',
    value: '[ ]',
    type: NodeType.Checkbox,
    parent: null,
    children: null,
    is: (t: NodeType) => t === NodeType.Checkbox,
    isNot: (t: NodeType) => t !== NodeType.Checkbox,
    ...overrides,
  }) as unknown as OrgNode;

const createMockView = (docContent = '[ ] task'): EditorView => {
  const state = EditorState.create({ doc: docContent });
  return {
    state,
    hasFocus: false,
    visibleRanges: [{ from: 0, to: docContent.length }],
  } as unknown as EditorView;
};

const NOOP_WIDGET_BUILDER = () => ({ destroy: vi.fn() });

const mockWidgets = (nodeType: NodeType): InlineEmbeddedWidgets => ({
  [nodeType]: [
    {
      id: 'test-widget',
      decorationType: 'replace' as const,
      widgetBuilder: NOOP_WIDGET_BUILDER,
    },
  ],
});

vi.mock('./org-inline-widget', () => ({
  OrgInlineWidget: {
    init: (_view: EditorView, node: OrgNode) => Decoration.replace({}).range(node.start, node.end),
  },
}));

test('buildInlineWidgetDecorations_returnsDecorationNone_whenNoMatchingWidget', () => {
  const view = createMockView();
  const orgNode = createMockOrgNode({ type: NodeType.Bold });
  const result = buildInlineWidgetDecorations({
    view,
    orgNode,
    inlineWidgets: mockWidgets(NodeType.Checkbox),
    getRootNode: () => orgNode,
    readonly: false,
  });
  expect(result).toBe(Decoration.none);
});

test('buildInlineWidgetDecorations_returnsDecorationNone_whenShouldSkipNodeIsTrue', () => {
  const view = createMockView();
  const orgNode = createMockOrgNode();
  const shouldSkipNode = vi.fn(() => true);

  const result = buildInlineWidgetDecorations({
    view,
    orgNode,
    inlineWidgets: mockWidgets(NodeType.Checkbox),
    getRootNode: () => orgNode,
    readonly: false,
    shouldSkipNode,
  });

  expect(shouldSkipNode).toHaveBeenCalled();
  expect(result).toBe(Decoration.none);
});

test('buildInlineWidgetDecorations_returnsDecorationNone_whenVisibleRangesEmpty', () => {
  const view = createMockView();
  const orgNode = createMockOrgNode();
  const emptyView = { ...view, visibleRanges: [] } as unknown as EditorView;

  const result = buildInlineWidgetDecorations({
    view: emptyView,
    orgNode,
    inlineWidgets: mockWidgets(NodeType.Checkbox),
    getRootNode: () => orgNode,
    readonly: false,
  });

  expect(result).toBe(Decoration.none);
});

test('buildInlineWidgetDecorations_prunesChildSubtree_forReplaceDecoration', () => {
  const view = createMockView();
  const childNode = createMockOrgNode({ start: 0, end: 3 });
  const parentNode = {
    ...createMockOrgNode({ start: 0, end: 3 }),
    children: { first: { ...childNode, next: null } },
  } as unknown as OrgNode;

  const result = buildInlineWidgetDecorations({
    view,
    orgNode: parentNode,
    inlineWidgets: mockWidgets(NodeType.Checkbox),
    getRootNode: () => parentNode,
    readonly: false,
  });

  expect(result).not.toBe(Decoration.none);
});
