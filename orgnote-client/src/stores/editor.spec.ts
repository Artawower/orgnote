import { test, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEditorStore } from './editor';
import { WidgetType } from 'orgnote-api';
import { NodeType } from 'org-mode-ast';

vi.mock('src/utils/dynamic-component', () => ({
  useDynamicComponent: () => ({
    mount: vi.fn(() => ({ destroy: vi.fn() })),
  }),
}));

beforeEach(() => {
  setActivePinia(createPinia());
});

test('useEditorStore.addWidgets: adds inline widget to registry', () => {
  const store = useEditorStore();

  store.addWidgets({
    id: 'test-bold',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'mark',
    classBuilder: () => 'test-class',
  });

  expect(store.inlineWidgets[NodeType.Bold]).toBeDefined();
  expect(store.inlineWidgets[NodeType.Bold]?.[0]?.decorationType).toBe('mark');
});

test('useEditorStore.addWidgets: adds multiline widget to registry', () => {
  const store = useEditorStore();

  store.addWidgets({
    id: 'test-src-block',
    type: WidgetType.Multiline,
    nodeType: NodeType.SrcBlock,
    widgetBuilder: vi.fn(),
  });

  expect(store.multilineWidgets[NodeType.SrcBlock]).toBeDefined();
});

test('useEditorStore.addWidgets: adds lineClass widget to registry', () => {
  const store = useEditorStore();

  store.addWidgets({
    id: 'test-headline',
    type: WidgetType.LineClass,
    nodeType: NodeType.Headline,
    class: 'org-headline-line',
    attributes: { style: '--org-list-depth: 2' },
  });

  expect(store.lineClasses[NodeType.Headline]).toBeDefined();
  expect(store.lineClasses[NodeType.Headline]?.[0]?.class).toBe('org-headline-line');
  expect(store.lineClasses[NodeType.Headline]?.[0]?.attributes).toEqual({
    style: '--org-list-depth: 2',
  });
});

test('useEditorStore.addWidgets: adds multiple widgets in single call', () => {
  const store = useEditorStore();

  store.addWidgets(
    {
      id: 'test-bold',
      type: WidgetType.Inline,
      nodeType: NodeType.Bold,
      decorationType: 'mark',
      classBuilder: () => 'bold',
    },
    {
      id: 'test-italic',
      type: WidgetType.Inline,
      nodeType: NodeType.Italic,
      decorationType: 'mark',
      classBuilder: () => 'italic',
    },
    {
      id: 'test-headline',
      type: WidgetType.LineClass,
      nodeType: NodeType.Headline,
      class: 'headline',
    },
  );

  expect(store.inlineWidgets[NodeType.Bold]).toBeDefined();
  expect(store.inlineWidgets[NodeType.Italic]).toBeDefined();
  expect(store.lineClasses[NodeType.Headline]).toBeDefined();
});

test('useEditorStore.addWidgets: preserves existing widgets when adding new', () => {
  const store = useEditorStore();

  store.addWidgets({
    id: 'test-bold',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'mark',
    classBuilder: () => 'bold',
  });

  store.addWidgets({
    id: 'test-italic',
    type: WidgetType.Inline,
    nodeType: NodeType.Italic,
    decorationType: 'mark',
    classBuilder: () => 'italic',
  });

  expect(store.inlineWidgets[NodeType.Bold]).toBeDefined();
  expect(store.inlineWidgets[NodeType.Italic]).toBeDefined();
});

test('useEditorStore.addWidgets: allows multiple widgets for same nodeType', () => {
  const store = useEditorStore();

  store.addWidgets({
    id: 'test-bold-1',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'mark',
    classBuilder: () => 'first',
  });

  store.addWidgets({
    id: 'test-bold-2',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'replace',
    classBuilder: () => 'second',
  });

  expect(store.inlineWidgets[NodeType.Bold]?.length).toBe(2);
});

test('useEditorStore.addWidgets: triggers reactivity on add', () => {
  const store = useEditorStore();
  const initialRef = store.inlineWidgets;

  store.addWidgets({
    id: 'test-bold',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'mark',
    classBuilder: () => 'bold',
  });

  expect(store.inlineWidgets).not.toBe(initialRef);
});

test('useEditorStore.removeWidget: removes widget by id from inline registry', () => {
  const store = useEditorStore();

  store.addWidgets({
    id: 'test-bold',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'mark',
    classBuilder: () => 'bold',
  });

  store.removeWidget('test-bold');

  expect(store.inlineWidgets[NodeType.Bold]).toBeUndefined();
});

test('useEditorStore.removeWidget: removes only widget with matching id', () => {
  const store = useEditorStore();

  store.addWidgets(
    {
      id: 'test-bold-1',
      type: WidgetType.Inline,
      nodeType: NodeType.Bold,
      decorationType: 'mark',
      classBuilder: () => 'first',
    },
    {
      id: 'test-bold-2',
      type: WidgetType.Inline,
      nodeType: NodeType.Bold,
      decorationType: 'replace',
      classBuilder: () => 'second',
    },
  );

  store.removeWidget('test-bold-1');

  expect(store.inlineWidgets[NodeType.Bold]?.length).toBe(1);
  expect(store.inlineWidgets[NodeType.Bold]?.[0]?.id).toBe('test-bold-2');
});

test('useEditorStore.removeWidget: preserves other widgets when removing one', () => {
  const store = useEditorStore();

  store.addWidgets(
    {
      id: 'test-bold',
      type: WidgetType.Inline,
      nodeType: NodeType.Bold,
      decorationType: 'mark',
      classBuilder: () => 'bold',
    },
    {
      id: 'test-italic',
      type: WidgetType.Inline,
      nodeType: NodeType.Italic,
      decorationType: 'mark',
      classBuilder: () => 'italic',
    },
  );

  store.removeWidget('test-bold');

  expect(store.inlineWidgets[NodeType.Bold]).toBeUndefined();
  expect(store.inlineWidgets[NodeType.Italic]).toBeDefined();
});

test('useEditorStore.removeWidget: handles removal of non-existent widget gracefully', () => {
  const store = useEditorStore();

  expect(() => store.removeWidget('non-existent-id')).not.toThrow();
});

test('useEditorStore.removeWidget: triggers reactivity on remove', () => {
  const store = useEditorStore();

  store.addWidgets({
    id: 'test-bold',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'mark',
    classBuilder: () => 'bold',
  });

  const refAfterAdd = store.inlineWidgets;
  store.removeWidget('test-bold');

  expect(store.inlineWidgets).not.toBe(refAfterAdd);
});

test('useEditorStore.inlineWidgets: returns only inline registry', () => {
  const store = useEditorStore();

  store.addWidgets(
    {
      id: 'test-bold',
      type: WidgetType.Inline,
      nodeType: NodeType.Bold,
      decorationType: 'mark',
      classBuilder: () => 'bold',
    },
    {
      id: 'test-src-block',
      type: WidgetType.Multiline,
      nodeType: NodeType.SrcBlock,
      widgetBuilder: vi.fn(),
    },
  );

  expect(store.inlineWidgets[NodeType.Bold]).toBeDefined();
  expect(store.inlineWidgets[NodeType.SrcBlock]).toBeUndefined();
});

test('useEditorStore.multilineWidgets: returns only multiline registry', () => {
  const store = useEditorStore();

  store.addWidgets(
    {
      id: 'test-bold',
      type: WidgetType.Inline,
      nodeType: NodeType.Bold,
      decorationType: 'mark',
      classBuilder: () => 'bold',
    },
    {
      id: 'test-src-block',
      type: WidgetType.Multiline,
      nodeType: NodeType.SrcBlock,
      widgetBuilder: vi.fn(),
    },
  );

  expect(store.multilineWidgets[NodeType.SrcBlock]).toBeDefined();
  expect(store.multilineWidgets[NodeType.Bold]).toBeUndefined();
});

test('useEditorStore.lineClasses: returns only lineClass registry', () => {
  const store = useEditorStore();

  store.addWidgets(
    {
      id: 'test-bold',
      type: WidgetType.Inline,
      nodeType: NodeType.Bold,
      decorationType: 'mark',
      classBuilder: () => 'bold',
    },
    {
      id: 'test-headline',
      type: WidgetType.LineClass,
      nodeType: NodeType.Headline,
      class: 'headline',
    },
  );

  expect(store.lineClasses[NodeType.Headline]).toBeDefined();
  expect(store.lineClasses[NodeType.Bold]).toBeUndefined();
});

test('useEditorStore.addExtensions: adds to extensions array', () => {
  const store = useEditorStore();
  const ext1 = { name: 'ext1' };
  const ext2 = { name: 'ext2' };

  store.addExtensions(ext1 as never, ext2 as never);

  expect(store.extensions.length).toBe(2);
});

test('useEditorStore.removeExtensions: removes from extensions array', () => {
  const store = useEditorStore();
  const ext1 = { name: 'ext1' };
  const ext2 = { name: 'ext2' };

  store.addExtensions(ext1 as never, ext2 as never);
  store.removeExtensions(ext1 as never);

  expect(store.extensions.length).toBe(1);
  expect(store.extensions[0]).toBe(ext2);
});

test('useEditorStore.addWidgets: replaces widget with same id (deduplication)', () => {
  const store = useEditorStore();

  store.addWidgets({
    id: 'test-bold',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'mark',
    classBuilder: () => 'original',
  });

  store.addWidgets({
    id: 'test-bold',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'replace',
    classBuilder: () => 'updated',
  });

  expect(store.inlineWidgets[NodeType.Bold]?.length).toBe(1);
  expect(store.inlineWidgets[NodeType.Bold]?.[0]?.decorationType).toBe('replace');
});

test('useEditorStore.addWidgets: preserves other widgets when replacing by id', () => {
  const store = useEditorStore();

  store.addWidgets(
    {
      id: 'widget-1',
      type: WidgetType.Inline,
      nodeType: NodeType.Bold,
      decorationType: 'mark',
      classBuilder: () => 'first',
    },
    {
      id: 'widget-2',
      type: WidgetType.Inline,
      nodeType: NodeType.Bold,
      decorationType: 'mark',
      classBuilder: () => 'second',
    },
  );

  store.addWidgets({
    id: 'widget-1',
    type: WidgetType.Inline,
    nodeType: NodeType.Bold,
    decorationType: 'replace',
    classBuilder: () => 'updated',
  });

  expect(store.inlineWidgets[NodeType.Bold]?.length).toBe(2);
  expect(store.inlineWidgets[NodeType.Bold]?.find((w) => w.id === 'widget-2')).toBeDefined();
});

test('useEditorStore.addWidgets: handles repeated calls simulating HMR', () => {
  const store = useEditorStore();

  const registerWidgets = () => {
    store.addWidgets(
      {
        id: 'hmr-widget-1',
        type: WidgetType.Inline,
        nodeType: NodeType.Bold,
        decorationType: 'mark',
        classBuilder: () => 'class',
      },
      {
        id: 'hmr-widget-2',
        type: WidgetType.Multiline,
        nodeType: NodeType.SrcBlock,
        widgetBuilder: vi.fn(),
      },
    );
  };

  registerWidgets();
  registerWidgets();
  registerWidgets();

  expect(store.inlineWidgets[NodeType.Bold]?.length).toBe(1);
  expect(store.multilineWidgets[NodeType.SrcBlock]?.length).toBe(1);
});

test('useEditorStore.activeContext: is null by default', () => {
  const store = useEditorStore();
  expect(store.activeContext).toBeNull();
});

test('useEditorStore.setActiveContext: sets active context with defaults', () => {
  const store = useEditorStore();
  const editorViewGetter = vi.fn();

  store.setActiveContext({
    cursorPosition: 10,
    selection: 'test selection',
    editorViewGetter,
    focused: true,
  });

  expect(store.activeContext?.cursorPosition).toBe(10);
  expect(store.activeContext?.selection).toBe('test selection');
  expect(store.activeContext?.editorViewGetter).toBe(editorViewGetter);
  expect(store.activeContext?.focused).toBe(true);
  expect(store.activeContext?.orgNode).toBeNull();
});

test('useEditorStore.setActiveContext: fills missing fields with defaults', () => {
  const store = useEditorStore();

  store.setActiveContext({ focused: true });

  expect(store.activeContext?.focused).toBe(true);
  expect(store.activeContext?.cursorPosition).toBe(0);
  expect(store.activeContext?.selection).toBe('');
  expect(store.activeContext?.orgNode).toBeNull();
});

test('useEditorStore.updateActiveContext: updates partial context', () => {
  const store = useEditorStore();

  store.setActiveContext({ focused: true });
  store.updateActiveContext({ cursorPosition: 25, selection: 'updated' });

  expect(store.activeContext?.cursorPosition).toBe(25);
  expect(store.activeContext?.selection).toBe('updated');
});

test('useEditorStore.updateActiveContext: does nothing when activeContext is null', () => {
  const store = useEditorStore();

  expect(() => store.updateActiveContext({ cursorPosition: 10 })).not.toThrow();
  expect(store.activeContext).toBeNull();
});

test('useEditorStore.clearActiveContext: sets activeContext to null', () => {
  const store = useEditorStore();

  store.setActiveContext({ focused: true, selection: 'test' });
  store.clearActiveContext();

  expect(store.activeContext).toBeNull();
});

test('useEditorStore.selection: returns empty string when no active context', () => {
  const store = useEditorStore();
  expect(store.selection).toBe('');
});

test('useEditorStore.selection: returns selection from active context', () => {
  const store = useEditorStore();

  store.setActiveContext({ selection: 'selected text', focused: true });

  expect(store.selection).toBe('selected text');
});

test('useEditorStore.hasSelection: returns false when no active context', () => {
  const store = useEditorStore();
  expect(store.hasSelection).toBe(false);
});

test('useEditorStore.hasSelection: returns false when selection is empty', () => {
  const store = useEditorStore();

  store.setActiveContext({ focused: true });

  expect(store.hasSelection).toBe(false);
});

test('useEditorStore.hasSelection: returns true when selection is not empty', () => {
  const store = useEditorStore();

  store.setActiveContext({ selection: 'some text', focused: true });

  expect(store.hasSelection).toBe(true);
});

test('useEditorStore.selection: updates reactively when context changes', () => {
  const store = useEditorStore();

  store.setActiveContext({ selection: 'initial', focused: true });
  expect(store.selection).toBe('initial');

  store.updateActiveContext({ selection: 'updated selection' });
  expect(store.selection).toBe('updated selection');
});

test('useEditorStore.hasSelection: updates reactively when selection changes', () => {
  const store = useEditorStore();

  store.setActiveContext({ focused: true });
  expect(store.hasSelection).toBe(false);

  store.updateActiveContext({ selection: 'now has selection' });
  expect(store.hasSelection).toBe(true);

  store.updateActiveContext({ selection: '' });
  expect(store.hasSelection).toBe(false);
});

test('useEditorStore.selection: returns empty string after clearActiveContext', () => {
  const store = useEditorStore();

  store.setActiveContext({ selection: 'test', focused: true });
  store.clearActiveContext();

  expect(store.selection).toBe('');
  expect(store.hasSelection).toBe(false);
});
