import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView, highlightActiveLine, keymap } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import type {
  EditorExtension,
  InlineEmbeddedWidget,
  InlineEmbeddedWidgets,
  MultilineEmbeddedWidget,
  MultilineEmbeddedWidgets,
  WidgetBuilder,
} from 'orgnote-api';
import { api } from 'src/boot/api';
import { useWidgetBuilder } from 'src/composables/use-widget-builder';
import {
  createBaseEditorExtensions,
  createOrgLanguageExtension,
  orgSelectionTheme,
} from 'src/utils/org-editor';
import { createImagePasteExtension } from 'src/utils/org-editor/extensions/image-paste';
import { useDynamicComponent } from 'src/utils/dynamic-component';
import { computed, shallowRef, toValue, watch } from 'vue';
import { editorLanguages } from './editor-languages';
import { type OrgNodeGetter } from './facets';
import {
  createFacetExtensions,
  createScrollMarginsExtension,
  createWidgetExtensions,
} from './store-extensions';
import { createActiveContextExtensions } from './use-active-context';
import { useEditorKeybindings } from 'src/composables/use-editor-keybindings';

export interface UseEditorStateOptions {
  readonly?: boolean;
  readonlyGetter?: () => boolean;
  filePathGetter?: () => string | undefined;
  editorViewGetter: () => EditorView | undefined;
  onContentUpdate: (content: string) => void;
}

const createBaseRichEditorExtensions = (
  editorViewGetter: () => EditorView | undefined,
  onContentUpdate: (content: string) => void,
): Extension[] => [
  ...createBaseEditorExtensions({ onContentUpdate }),
  orgSelectionTheme,
  EditorView.lineWrapping,
  keymap.of([
    {
      key: 'Escape',
      run: () => {
        editorViewGetter()?.contentDOM.blur();
        return false;
      },
    },
  ]),
];

const createReadonlyExtensions = (readonly: boolean): Extension[] => [
  EditorState.readOnly.of(readonly),
  ...(readonly ? [] : [highlightActiveLine()]),
];

type Widget = InlineEmbeddedWidget | MultilineEmbeddedWidget;
type WidgetEntries<T extends InlineEmbeddedWidgets | MultilineEmbeddedWidgets> = Array<
  readonly [string, T[keyof T]]
>;

const toWidgetEntries = <T extends InlineEmbeddedWidgets | MultilineEmbeddedWidgets>(
  widgets: T,
): WidgetEntries<T> => Object.entries(widgets) as WidgetEntries<T>;

export const useEditorState = (options: UseEditorStateOptions) => {
  const configStore = api.core.useConfig();
  const editorStore = api.core.useEditor();
  const editorKeybindings = useEditorKeybindings();
  const editorConfig = computed(() => configStore.config.editor);
  const { createWidgetBuilder, createMultilineWidgetBuilder } = useWidgetBuilder();
  const dynamicComponent = useDynamicComponent();
  const { keyboardOpened } = api.ui.useKeyboardState();
  const { tabletBelow } = api.ui.useScreenDetection();

  const editorViewRef: { current: EditorView | null } = { current: null };

  const compartments = {
    readonly: new Compartment(),
    widgets: new Compartment(),
    editorExtensions: new Compartment(),
    scrollMargins: new Compartment(),
  };

  const orgNode = shallowRef<OrgNode | null>(null);
  const getOrgNode: OrgNodeGetter = () => orgNode.value;

  const resolveInlineWidgetBuilder = (widget: Widget, builderFn: typeof createWidgetBuilder) => {
    if (!widget.component || widget.widgetBuilder) return widget.widgetBuilder;
    return builderFn(widget.component, widget.componentProps);
  };

  const multilineBuilderCache = new WeakMap<MultilineEmbeddedWidget, WidgetBuilder>();

  const resolveMultilineWidgetBuilder = (widget: MultilineEmbeddedWidget) => {
    if (!widget.component || widget.widgetBuilder) return widget.widgetBuilder;
    const cached = multilineBuilderCache.get(widget);
    if (cached) return cached;
    const builder = createMultilineWidgetBuilder(widget.component, widget);
    multilineBuilderCache.set(widget, builder);
    return builder;
  };

  const buildWidgets = <T extends InlineEmbeddedWidgets | MultilineEmbeddedWidgets>(
    widgets: T,
    builderFn: typeof createWidgetBuilder,
  ): T =>
    Object.fromEntries(
      toWidgetEntries(widgets).flatMap(([nodeType, widgetList]) => {
        if (!widgetList) return [];
        const mapped = (widgetList as Widget[]).map((w) => ({
          ...w,
          widgetBuilder: resolveInlineWidgetBuilder(w, builderFn),
        }));
        return [[nodeType, mapped] as const];
      }),
    ) as T;

  const buildInlineWidgets = () =>
    buildWidgets(toValue(editorStore.inlineWidgets), createWidgetBuilder);

  const buildMultilineWidgets = () => {
    const result: Partial<MultilineEmbeddedWidgets> = {};
    for (const [nodeType, widgetList] of toWidgetEntries(toValue(editorStore.multilineWidgets))) {
      if (!widgetList) continue;
      result[nodeType as keyof MultilineEmbeddedWidgets] = widgetList.map((w) => ({
        ...w,
        widgetBuilder: resolveMultilineWidgetBuilder(w),
      }));
    }
    return result as MultilineEmbeddedWidgets;
  };

  const buildEditorExtensions = (readonly: boolean): Extension[] => {
    const extensions = toValue(editorStore.extensions) as EditorExtension[];
    return extensions.map((ext) =>
      ext({
        orgNodeGetter: getOrgNode,
        readonly,
        showSpecialSymbols: editorConfig.value.showSpecialSymbols,
        dynamicComponent,
        editorViewGetter: options.editorViewGetter,
      }),
    );
  };

  const getReadonly = (): boolean => options.readonlyGetter?.() ?? false;

  const createState = (content: string): EditorState => {
    const readonly = getReadonly();
    const widgetExts = editorConfig.value.showSpecialSymbols
      ? []
      : createWidgetExtensions(editorViewRef);

    return EditorState.create({
      doc: content,
      extensions: [
        ...createBaseRichEditorExtensions(options.editorViewGetter, options.onContentUpdate),
        ...(options.filePathGetter ? [createImagePasteExtension(options.filePathGetter)] : []),
        ...createActiveContextExtensions({
          editorViewGetter: options.editorViewGetter,
          filePathGetter: options.filePathGetter,
          getOrgNode,
        }),
        compartments.readonly.of(createReadonlyExtensions(readonly)),
        compartments.widgets.of([
          ...createFacetExtensions(
            getOrgNode,
            readonly,
            buildInlineWidgets(),
            buildMultilineWidgets(),
            toValue(editorStore.lineClasses),
          ),
          ...widgetExts,
        ]),
        compartments.editorExtensions.of(buildEditorExtensions(readonly)),
        compartments.scrollMargins.of(
          createScrollMarginsExtension(keyboardOpened.value, tabletBelow.value),
        ),
        editorKeybindings.initialExtension,
        createOrgLanguageExtension({
          wrap: editorLanguages,
          onAstChanged: (node) => {
            orgNode.value = node;
            editorStore.updateActiveContext({ orgNode: node });
          },
        }),
      ],
    });
  };

  const reconfigureReadonly = (view: EditorView, value: boolean): void => {
    view.dispatch({ effects: compartments.readonly.reconfigure(createReadonlyExtensions(value)) });
  };

  const reconfigureWidgets = (view: EditorView, readonlyOverride?: boolean): void => {
    const readonly = readonlyOverride !== undefined ? readonlyOverride : getReadonly();
    const widgetExts = editorConfig.value.showSpecialSymbols
      ? []
      : createWidgetExtensions(editorViewRef);

    view.dispatch({
      effects: [
        compartments.widgets.reconfigure([
          ...createFacetExtensions(
            getOrgNode,
            readonly,
            buildInlineWidgets(),
            buildMultilineWidgets(),
            toValue(editorStore.lineClasses),
          ),
          ...widgetExts,
        ]),
        compartments.editorExtensions.reconfigure(buildEditorExtensions(readonly)),
      ],
    });
  };

  const setupWidgetsWatcher = (viewGetter: () => EditorView | undefined): void => {
    watch(
      [
        () => editorConfig.value.showSpecialSymbols,
        () => editorStore.inlineWidgets,
        () => editorStore.multilineWidgets,
        () => editorStore.lineClasses,
        () => editorStore.extensions,
      ],
      () => {
        const view = viewGetter();
        if (view) reconfigureWidgets(view);
      },
    );
  };

  const setupScrollMarginsWatcher = (viewGetter: () => EditorView | undefined): void => {
    watch([keyboardOpened, tabletBelow], ([newKeyboard, newTablet], [oldKeyboard]) => {
      const view = viewGetter();
      if (!view) return;
      const scrollExt = createScrollMarginsExtension(newKeyboard, newTablet);
      const isKeyboardOpening = !oldKeyboard && newKeyboard && newTablet;
      view.dispatch({
        effects: compartments.scrollMargins.reconfigure(scrollExt),
        scrollIntoView: isKeyboardOpening,
      });
    });
  };

  const setEditorView = (view: EditorView | null): void => {
    editorViewRef.current = view;
    editorKeybindings.watchKeybindings(view ?? undefined);
  };

  return {
    orgNode,
    createState,
    reconfigureReadonly,
    reconfigureWidgets,
    setupWidgetsWatcher,
    setupScrollMarginsWatcher,
    setEditorView,
  };
};
