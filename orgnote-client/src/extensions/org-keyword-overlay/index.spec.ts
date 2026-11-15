import { beforeEach, expect, test, vi } from 'vitest';
import { NodeType, parse } from 'org-mode-ast';
import { WidgetType, type OrgLineClass, type WidgetMeta } from 'orgnote-api';
import { orgKeywordOverlayExtension } from './index';

const addWidgets = vi.fn();
const addExtensions = vi.fn();
const removeWidget = vi.fn();
const removeExtensions = vi.fn();

const api = {
  core: {
    useEditor: () => ({
      addWidgets,
      addExtensions,
      removeWidget,
      removeExtensions,
    }),
  },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
});

const firstNode = (content: string) => parse(content).children?.first;

type LineClassWidgetMeta = { type: typeof WidgetType.LineClass; nodeType: NodeType } & OrgLineClass;

const isLineClassWidget = (widget: WidgetMeta): widget is LineClassWidgetMeta =>
  widget.type === WidgetType.LineClass;

const lineClassWidgets = (): LineClassWidgetMeta[] =>
  addWidgets.mock.calls.flat().filter(isLineClassWidget);

const lineClassResolver = (widget: LineClassWidgetMeta): ((node: ReturnType<typeof firstNode>) => string) => {
  expect(widget.class).toBeTypeOf('function');
  return widget.class as (node: ReturnType<typeof firstNode>) => string;
};

test('orgKeywordOverlayExtension registers description line class from AST keyword nodes', async () => {
  await orgKeywordOverlayExtension.onMounted?.(api);

  const descriptionLineClass = lineClassWidgets().find(
    (widget) => widget.nodeType === NodeType.Keyword,
  );

  if (!descriptionLineClass) throw new Error('description line class widget was not registered');

  const resolveClass = lineClassResolver(descriptionLineClass);
  expect(resolveClass(firstNode('#+DESCRIPTION: Summary'))).toBe('org-description-line');
  expect(resolveClass(firstNode('#+TITLE: Summary'))).toBe('');
});

