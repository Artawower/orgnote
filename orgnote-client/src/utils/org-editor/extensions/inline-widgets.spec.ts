import { expect, test, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView, Decoration } from '@codemirror/view';
import { NodeType, type OrgNode, parse, withMetaInfo } from 'org-mode-ast';
import { createStandaloneInlineWidgetsPlugin } from './inline-widgets';

vi.mock('../widgets/org-inline-widget', () => ({
  OrgInlineWidget: {
    init: (_view: EditorView, node: OrgNode) => Decoration.replace({}).range(node.start, node.end),
  },
}));

const makeView = (
  doc: string,
  ...extensions: ReturnType<typeof createStandaloneInlineWidgetsPlugin>[]
) => {
  const state = EditorState.create({ doc, extensions });
  return new EditorView({ state });
};

test('createStandaloneInlineWidgetsPlugin_returnsDecorationNone_whenOrgNodeIsNull', () => {
  const getOrgNode = vi.fn(() => null as OrgNode | null);
  const plugin = createStandaloneInlineWidgetsPlugin({
    getOrgNode,
    getWidgets: () => ({}),
  });

  const view = makeView('[ ] task', plugin);
  const instance = view.plugin(plugin);

  expect(instance).toBeDefined();
  expect(instance!.decorations).toBe(Decoration.none);

  view.destroy();
});

test('createStandaloneInlineWidgetsPlugin_alwaysShowsWidgets_inReadonlyMode', () => {
  const orgNode = withMetaInfo(parse('- [ ] task'));

  const checkboxWidget = {
    [NodeType.Checkbox]: [
      {
        id: 'inline-checkbox',
        decorationType: 'replace' as const,
        ignoreEditing: false,
        widgetBuilder: () => ({ destroy: vi.fn() }),
      },
    ],
  };

  const plugin = createStandaloneInlineWidgetsPlugin({
    getOrgNode: () => orgNode,
    getWidgets: () => checkboxWidget,
    readonly: true,
  });

  const view = makeView('- [ ] task', plugin);
  const instance = view.plugin(plugin);
  expect(instance).toBeDefined();
  expect(instance!.decorations).not.toBe(Decoration.none);

  view.destroy();
});

test('createStandaloneInlineWidgetsPlugin_rebuildsDecorations_whenOrgNodeBecomesAvailable', () => {
  let orgNode: OrgNode | null = null;
  const getOrgNode = vi.fn(() => orgNode);

  const checkboxWidget = {
    [NodeType.Checkbox]: [
      {
        id: 'inline-checkbox',
        decorationType: 'replace' as const,
        widgetBuilder: () => ({ destroy: vi.fn() }),
      },
    ],
  };

  const plugin = createStandaloneInlineWidgetsPlugin({
    getOrgNode,
    getWidgets: () => checkboxWidget,
  });

  const view = makeView('- [ ] task', plugin);
  const instance = view.plugin(plugin);
  expect(instance).toBeDefined();
  expect(instance!.decorations).toBe(Decoration.none);

  orgNode = withMetaInfo(parse('- [ ] task'));
  view.dispatch(view.state.update({}));

  expect(instance!.decorations).not.toBe(Decoration.none);

  view.destroy();
});
