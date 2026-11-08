import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';
import type {
  InlineEmbeddedWidgets,
  MultilineEmbeddedWidgets,
  OrgLineClasses,
  EditorExtension,
  WidgetMeta,
  EditorStore,
  InlineEmbeddedWidget,
  MultilineEmbeddedWidget,
  OrgLineClass,
  ActiveEditorContext,
} from 'orgnote-api';
import { WidgetType } from 'orgnote-api';
import { editOrgDocument } from 'orgnote-api/utils';

interface WidgetRegistry {
  [WidgetType.Inline]: InlineEmbeddedWidgets;
  [WidgetType.Multiline]: MultilineEmbeddedWidgets;
  [WidgetType.LineClass]: OrgLineClasses;
}

type Widget = InlineEmbeddedWidget | MultilineEmbeddedWidget | OrgLineClass;

const filterWidgetById = <T extends Widget>(
  widgets: Record<string, T[] | undefined>,
  widgetId: string,
): Record<string, T[] | undefined> => {
  const result: Record<string, T[] | undefined> = {};
  for (const [nodeType, widgetList] of Object.entries(widgets)) {
    if (!widgetList) continue;
    const filtered = widgetList.filter((w) => w.id !== widgetId);
    if (filtered.length > 0) {
      result[nodeType] = filtered;
    }
  }
  return result;
};

export const useEditorStore = defineStore<'editor', EditorStore>('editor', () => {
  const widgetRegistry = shallowRef<WidgetRegistry>({
    [WidgetType.Inline]: {},
    [WidgetType.Multiline]: {},
    [WidgetType.LineClass]: {},
  });

  const extensions = shallowRef<EditorExtension[]>([]);
  const activeContext = shallowRef<ActiveEditorContext | null>(null);

  const addWidgets = (...widgets: WidgetMeta[]): void => {
    const newRegistry: WidgetRegistry = {
      [WidgetType.Inline]: { ...widgetRegistry.value[WidgetType.Inline] },
      [WidgetType.Multiline]: { ...widgetRegistry.value[WidgetType.Multiline] },
      [WidgetType.LineClass]: { ...widgetRegistry.value[WidgetType.LineClass] },
    };

    widgets.forEach(({ type, nodeType, id, ...widget }) => {
      const registry = newRegistry[type] as Record<string, Widget[]>;
      const existingWidgets = registry[nodeType] ?? [];
      const withoutDuplicate = existingWidgets.filter((w) => w.id !== id);
      registry[nodeType] = [...withoutDuplicate, { id, ...widget } as Widget];
    });

    widgetRegistry.value = newRegistry;
  };

  const removeWidget = (widgetId: string): void => {
    widgetRegistry.value = {
      [WidgetType.Inline]: filterWidgetById(widgetRegistry.value[WidgetType.Inline], widgetId),
      [WidgetType.Multiline]: filterWidgetById(widgetRegistry.value[WidgetType.Multiline], widgetId),
      [WidgetType.LineClass]: filterWidgetById(widgetRegistry.value[WidgetType.LineClass], widgetId),
    };
  };

  const addExtensions = (...newExtensions: EditorExtension[]): void => {
    extensions.value = [...extensions.value, ...newExtensions];
  };

  const removeExtensions = (...toRemove: EditorExtension[]): void => {
    extensions.value = extensions.value.filter((ext) => !toRemove.includes(ext));
  };

  const inlineWidgets = computed(() => widgetRegistry.value[WidgetType.Inline]);
  const multilineWidgets = computed(() => widgetRegistry.value[WidgetType.Multiline]);
  const lineClasses = computed(() => widgetRegistry.value[WidgetType.LineClass]);

  const selection = computed(() => activeContext.value?.selection ?? '');
  const hasSelection = computed(() => selection.value.length > 0);

  const DEFAULT_ACTIVE_CONTEXT: ActiveEditorContext = {
    orgNode: null,
    cursorPosition: 0,
    selection: '',
    editorViewGetter: () => undefined,
    focused: false,
  };

  const setActiveContext = (ctx: Partial<ActiveEditorContext>): void => {
    activeContext.value = { ...DEFAULT_ACTIVE_CONTEXT, ...ctx };
  };

  const updateActiveContext = (ctx: Partial<ActiveEditorContext>): void => {
    if (!activeContext.value) return;
    activeContext.value = { ...activeContext.value, ...ctx };
  };

  const clearActiveContext = (): void => {
    activeContext.value = null;
  };

  const editActiveDocument: EditorStore['editActiveDocument'] = (mutate, options = {}) => {
    const context = activeContext.value;
    const view = context?.editorViewGetter();
    if (!context || !view) return false;

    const content = view.state.doc.toString();
    const nextContent = editOrgDocument(content, (doc) => {
      mutate({
        ...context,
        doc,
        root: doc.root,
        view,
      });
    });
    if (nextContent === content) return true;

    const changes = { from: 0, to: view.state.doc.length, insert: nextContent };
    view.dispatch({
      changes,
      selection: options.preserveSelection === false ? undefined : { anchor: context.cursorPosition },
      scrollIntoView: options.scrollIntoView,
    });
    return true;
  };


  return {
    inlineWidgets,
    multilineWidgets,
    lineClasses,
    extensions,
    activeContext,
    addWidgets,
    removeWidget,
    addExtensions,
    removeExtensions,
    editActiveDocument,
    setActiveContext,
    updateActiveContext,
    clearActiveContext,
    selection,
    hasSelection,
  };
});
