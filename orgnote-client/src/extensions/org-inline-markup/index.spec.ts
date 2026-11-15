import { test, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { setActivePinia, createPinia } from 'pinia';
import { orgInlineMarkupExtension, orgInlineMarkupManifest } from './index';
import { NodeType } from 'org-mode-ast';
import type { LineAttributes, WidgetMeta } from 'orgnote-api';
import { resolveValue } from 'src/utils/resolve-value';

type ClassGetter = string | ((node: unknown) => string);
type ClassBuilder = (node: unknown) => string;
type AttributesGetter =
  | LineAttributes
  | ((node: unknown) => LineAttributes | undefined);

interface LineClassWidget {
  class: ClassGetter;
  attributes?: AttributesGetter;
}

interface InlineWidget {
  classBuilder?: ClassBuilder;
}

type MockOrgNode = {
  parent?: MockOrgNode;
  title?: { children: { get: (idx: number) => unknown } };
  next?: unknown;
  ordered?: boolean;
  is?: (nodeType: NodeType) => boolean;
};

const createMockNode = (
  type: NodeType,
  overrides: Partial<MockOrgNode> = {},
): MockOrgNode => ({
  ...overrides,
  is: (nodeType: NodeType) => nodeType === type,
});

const resolveLineAttributes = (
  attributes: AttributesGetter | undefined,
  node: unknown,
 ): LineAttributes | undefined => resolveValue(attributes, node);

const mockAddWidgets = vi.fn();
const mockRemoveWidget = vi.fn();
const mockCreateWidgetBuilder = vi.fn(() => vi.fn());
const mockApplyScopedStyles = vi.fn();
const mockRemoveScopedStyles = vi.fn();

const mockApi = {
  core: {
    useEditor: () => ({
      addWidgets: mockAddWidgets,
      removeWidget: mockRemoveWidget,
      createWidgetBuilder: mockCreateWidgetBuilder,
    }),
  },
  utils: {
    applyScopedStyles: mockApplyScopedStyles,
    removeScopedStyles: mockRemoveScopedStyles,
  },
} as never;

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

afterEach(() => {
  const styleEl = document.getElementById('org-inline-markup');
  styleEl?.remove();
});

test('orgInlineMarkupManifest: has correct name', () => {
  expect(orgInlineMarkupManifest.name).toBe('Inline markup');
});

test('orgInlineMarkupManifest: has builtin source type', () => {
  expect(orgInlineMarkupManifest.source.type).toBe('builtin');
});

test('orgInlineMarkupManifest: has extension category', () => {
  expect(orgInlineMarkupManifest.category).toBe('extension');
});

test('orgInlineMarkupManifest: has version', () => {
  expect(orgInlineMarkupManifest.version).toBeDefined();
});

test('orgInlineMarkupExtension.onMounted: applies scoped styles', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  expect(mockApplyScopedStyles).toHaveBeenCalledTimes(1);
  expect(mockApplyScopedStyles).toHaveBeenCalledWith('org-inline-markup', expect.any(String));
});

test('orgInlineMarkupExtension.onMounted: applies styles with correct scope id', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const scopeId = mockApplyScopedStyles.mock.calls[0]?.[0];
  expect(scopeId).toBe('org-inline-markup');
});

test('orgInlineMarkupExtension.onMounted: bullet styles do not disable text selection', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const styles = readFileSync('src/extensions/org-inline-markup/styles.css', 'utf8');

  expect(styles).toContain('.org-list-bullet');
  expect(styles).not.toContain('user-select: none');
});

test('orgInlineMarkupExtension.onMounted: adds widgets to editor store', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  expect(mockAddWidgets).toHaveBeenCalledTimes(1);
});

test('orgInlineMarkupExtension.onMounted: adds inline widgets', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const inlineWidgets = widgets.filter((w) => w.type === 'inline');

  expect(inlineWidgets.length).toBeGreaterThan(0);
});

test('orgInlineMarkupExtension.onMounted: adds lineClass widgets', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const lineClassWidgets = widgets.filter((w) => w.type === 'line-class');

  expect(lineClassWidgets.length).toBeGreaterThan(0);
});

test('orgInlineMarkupExtension.onMounted: registers widget for Bold nodeType', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const boldWidget = widgets.find((w) => w.nodeType === NodeType.Bold);

  expect(boldWidget).toBeUndefined();
});

test('orgInlineMarkupExtension.onMounted: registers widget for TodoKeyword nodeType', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const todoWidget = widgets.find((w) => w.nodeType === NodeType.TodoKeyword);

  expect(todoWidget).toBeDefined();
  expect(todoWidget!.type).toBe('inline');
});

test('orgInlineMarkupExtension.onMounted: registers lineClass for Headline nodeType', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const headlineWidget = widgets.find((w) => w.nodeType === NodeType.Headline);

  expect(headlineWidget).toBeDefined();
  expect(headlineWidget!.type).toBe('line-class');
});

test('orgInlineMarkupExtension.onMounted: registers lineClass for ListItem nodeType', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const listItemWidget = widgets.find((w) => w.nodeType === NodeType.ListItem);

  expect(listItemWidget).toBeDefined();
  expect(listItemWidget!.type).toBe('line-class');
});

test('orgInlineMarkupExtension.onUnmounted: removes scoped styles', async () => {
  await orgInlineMarkupExtension.onUnmounted!(mockApi);

  expect(mockRemoveScopedStyles).toHaveBeenCalledTimes(1);
  expect(mockRemoveScopedStyles).toHaveBeenCalledWith('org-inline-markup');
});

test('orgInlineMarkupExtension.onUnmounted: removes all widgets that were added by id', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);
  const addedWidgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const addedIds = addedWidgets.map((w) => w.id);

  vi.clearAllMocks();
  await orgInlineMarkupExtension.onUnmounted!(mockApi);

  const removedIds = mockRemoveWidget.mock.calls.map((call) => call[0]);

  addedIds.forEach((id) => {
    expect(removedIds).toContain(id);
  });
});

test('orgInlineMarkupExtension.onUnmounted: removes same number of widgets as added', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);
  const addedCount = (mockAddWidgets.mock.calls[0] as WidgetMeta[]).length;

  vi.clearAllMocks();
  await orgInlineMarkupExtension.onUnmounted!(mockApi);

  expect(mockRemoveWidget).toHaveBeenCalledTimes(addedCount);
});

test('orgInlineMarkupExtension: ListItem lineClass returns correct class with checked state', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const listItemWidget = widgets.find(
    (w) => w.nodeType === NodeType.ListItem,
  ) as unknown as LineClassWidget;

  const topLevelList = createMockNode(NodeType.List);
  const mockCheckedNode = createMockNode(NodeType.ListItem, {
    title: {
      children: {
        get: (idx: number) => (idx === 1 ? { checked: true } : null),
      },
    },
    parent: topLevelList,
  });

  const classGetter = listItemWidget.class as ClassBuilder;
  const className = classGetter(mockCheckedNode);
  const attributes = resolveLineAttributes(listItemWidget.attributes, mockCheckedNode);

  expect(className).toContain('org-list-item-line');
  expect(className).toContain('org-list-item-checked');
  expect(className).toContain('org-list-item-bullet-line');
  expect(attributes).toEqual({ style: '--org-list-depth: 1' });
});

test('orgInlineMarkupExtension: ListItem lineClass returns ordered class when parent is ordered', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const listItemWidget = widgets.find(
    (w) => w.nodeType === NodeType.ListItem,
  ) as unknown as LineClassWidget;

  const orderedList = createMockNode(NodeType.List, { ordered: true });
  const mockOrderedNode = createMockNode(NodeType.ListItem, {
    title: { children: { get: () => null } },
    parent: orderedList,
  });

  const classGetter = listItemWidget.class as ClassBuilder;
  const className = classGetter(mockOrderedNode);
  const attributes = resolveLineAttributes(listItemWidget.attributes, mockOrderedNode);

  expect(className).toContain('org-list-item-ordered-line');
  expect(className).not.toContain('org-list-item-bullet-line');
  expect(attributes).toEqual({ style: '--org-list-depth: 1' });
});

test('orgInlineMarkupExtension: ListItem lineClass keeps nested bullet classes stable', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const listItemWidget = widgets.find(
    (w) => w.nodeType === NodeType.ListItem,
  ) as unknown as LineClassWidget;

  const rootList = createMockNode(NodeType.List);
  const rootListItem = createMockNode(NodeType.ListItem, { parent: rootList });
  const nestedSection = createMockNode(NodeType.Section, { parent: rootListItem });
  const nestedList = createMockNode(NodeType.List, { parent: nestedSection });
  const nestedBulletItem = createMockNode(NodeType.ListItem, {
    title: { children: { get: () => null } },
    parent: nestedList,
  });

  const classGetter = listItemWidget.class as ClassBuilder;
  const className = classGetter(nestedBulletItem);
  const attributes = resolveLineAttributes(listItemWidget.attributes, nestedBulletItem);

  expect(className).toContain('org-list-item-line');
  expect(className).toContain('org-list-item-bullet-line');
  expect(className).not.toContain('org-list-item-ordered-line');
  expect(attributes).toEqual({ style: '--org-list-depth: 2' });
});

test('orgInlineMarkupExtension: ListItem lineClass keeps nested ordered classes stable', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const listItemWidget = widgets.find(
    (w) => w.nodeType === NodeType.ListItem,
  ) as unknown as LineClassWidget;

  const rootList = createMockNode(NodeType.List);
  const rootListItem = createMockNode(NodeType.ListItem, { parent: rootList });
  const nestedSection = createMockNode(NodeType.Section, { parent: rootListItem });
  const nestedOrderedList = createMockNode(NodeType.List, {
    parent: nestedSection,
    ordered: true,
  });
  const nestedOrderedItem = createMockNode(NodeType.ListItem, {
    title: { children: { get: () => null } },
    parent: nestedOrderedList,
  });

  const classGetter = listItemWidget.class as ClassBuilder;
  const className = classGetter(nestedOrderedItem);
  const attributes = resolveLineAttributes(listItemWidget.attributes, nestedOrderedItem);

  expect(className).toContain('org-list-item-line');
  expect(className).toContain('org-list-item-ordered-line');
  expect(className).not.toContain('org-list-item-bullet-line');
  expect(attributes).toEqual({ style: '--org-list-depth: 2' });
});

test('orgInlineMarkupExtension: ListItem lineClass marks nested list items as section lines', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const listItemWidget = widgets.find(
    (w) => w.nodeType === NodeType.ListItem,
  ) as unknown as LineClassWidget;

  const rootList = createMockNode(NodeType.List);
  const rootListItem = createMockNode(NodeType.ListItem, { parent: rootList });
  const nestedSection = createMockNode(NodeType.Section, { parent: rootListItem });
  const nestedList = createMockNode(NodeType.List, { parent: nestedSection });
  const emptyNestedItem = createMockNode(NodeType.ListItem, {
    title: { children: { get: () => null } },
    parent: nestedList,
  });

  const classGetter = listItemWidget.class as ClassBuilder;
  const className = classGetter(emptyNestedItem);

  expect(className).toContain('org-list-item-line');
  expect(className).toContain('org-list-item-bullet-line');
  expect(className).toContain('org-list-item-section-line');
});

test('orgInlineMarkupExtension: Section lineClass exposes full nested depth as css variable', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const sectionWidget = widgets.find(
    (w) => w.nodeType === NodeType.Section,
  ) as unknown as LineClassWidget;

  const deepSection = Array.from({ length: 11 }).reduce<MockOrgNode | undefined>(
    (parentNode) => {
      const currentList = createMockNode(NodeType.List, { parent: parentNode });
      const currentItem = createMockNode(NodeType.ListItem, { parent: currentList });
      return createMockNode(NodeType.Section, { parent: currentItem });
    },
    undefined,
  );
  expect(deepSection).toBeDefined();

  const classGetter = sectionWidget.class as ClassBuilder;
  const className = classGetter(deepSection);
  const attributes = resolveLineAttributes(sectionWidget.attributes, deepSection);

  expect(className).toContain('org-list-item-section-line');
  expect(attributes).toEqual({ style: '--org-list-depth: 11' });
});

test('orgInlineMarkupExtension: Section lineClass adds nested list depth attributes', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const sectionWidget = widgets.find(
    (w) => w.nodeType === NodeType.Section,
  ) as unknown as LineClassWidget;

  const parentList = createMockNode(NodeType.List);
  const rootListItem = createMockNode(NodeType.ListItem, { parent: parentList });
  const childSection = createMockNode(NodeType.Section, { parent: rootListItem });
  const childList = createMockNode(NodeType.List, { parent: childSection });
  const childListItem = createMockNode(NodeType.ListItem, { parent: childList });
  const nestedSection = createMockNode(NodeType.Section, { parent: childListItem });

  const classGetter = sectionWidget.class as ClassBuilder;
  const className = classGetter(nestedSection);
  const attributes = resolveLineAttributes(sectionWidget.attributes, nestedSection);

  expect(className).toContain('org-list-item-section-line');
  expect(attributes).toEqual({ style: '--org-list-depth: 2' });
});

test('orgInlineMarkupExtension: Headline lineClass returns level-specific class', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const headlineWidget = widgets.find(
    (w) => w.nodeType === NodeType.Headline,
  ) as unknown as LineClassWidget;

  const mockHeadlineNode = { level: 3 };
  const classGetter = headlineWidget.class as ClassBuilder;
  const className = classGetter(mockHeadlineNode);

  expect(className).toContain('org-headline-line');
  expect(className).toContain('org-headline-3');
});

test('orgInlineMarkupExtension: TodoKeyword classBuilder returns keyword-specific class', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const todoWidget = widgets.find(
    (w) => w.nodeType === NodeType.TodoKeyword,
  ) as unknown as InlineWidget;

  const mockTodoNode = { value: 'TODO' };
  const classBuilder = todoWidget.classBuilder!;
  const className = classBuilder(mockTodoNode);

  expect(className).toBe('org-keyword-todo');
});

test('orgInlineMarkupExtension: TodoKeyword classBuilder handles different keywords', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);

  const widgets = mockAddWidgets.mock.calls[0] as WidgetMeta[];
  const todoWidget = widgets.find(
    (w) => w.nodeType === NodeType.TodoKeyword,
  ) as unknown as InlineWidget;

  const classBuilder = todoWidget.classBuilder!;
  expect(classBuilder({ value: 'DONE' })).toBe('org-keyword-done');
  expect(classBuilder({ value: 'WAIT' })).toBe('org-keyword-wait');
});

test('orgInlineMarkupExtension: mount and unmount cycle is idempotent', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);
  await orgInlineMarkupExtension.onUnmounted!(mockApi);

  vi.clearAllMocks();

  await orgInlineMarkupExtension.onMounted!(mockApi);
  await orgInlineMarkupExtension.onUnmounted!(mockApi);

  expect(mockApplyScopedStyles).toHaveBeenCalledTimes(1);
  expect(mockRemoveScopedStyles).toHaveBeenCalledTimes(1);
});

test('orgInlineMarkupExtension: can be mounted multiple times after unmount', async () => {
  await orgInlineMarkupExtension.onMounted!(mockApi);
  await orgInlineMarkupExtension.onUnmounted!(mockApi);
  await orgInlineMarkupExtension.onMounted!(mockApi);

  expect(mockApplyScopedStyles).toHaveBeenCalledTimes(2);
  expect(mockAddWidgets).toHaveBeenCalledTimes(2);
});
