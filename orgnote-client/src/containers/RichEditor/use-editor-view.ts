import { EditorView } from '@codemirror/view';
import { api } from 'src/boot/api';
import { useEditorState, type UseEditorStateOptions } from './use-editor-state';

export type UseEditorViewOptions = Omit<UseEditorStateOptions, 'editorViewGetter'>;

export const useEditorView = (options: UseEditorViewOptions) => {
  let editorView: EditorView | undefined;
  let currentDocumentKey: string | undefined;

  const getEditorView = () => editorView;
  const editorStore = api.core.useEditor();

  const {
    orgNode,
    createState,
    reconfigureReadonly,
    reconfigureWidgets,
    setupWidgetsWatcher,
    setupScrollMarginsWatcher,
    setEditorView,
  } = useEditorState({
    ...options,
    editorViewGetter: getEditorView,
  });

  const resetState = (content: string): void => {
    if (!editorView) return;
    editorView.setState(createState(content));
  };

  const refreshActiveContext = (): void => {
    if (!editorView) return;
    const isActiveEditor = editorStore.activeContext?.editorViewGetter === getEditorView;
    if (!isActiveEditor) return;

    editorStore.setActiveContext({
      orgNode: orgNode.value,
      cursorPosition: 0,
      selection: '',
      editorViewGetter: getEditorView,
      filePath: options.filePathGetter?.(),
      focused: editorView.hasFocus,
    });
  };

  const initView = (parent: HTMLElement, content: string, documentKey?: string): EditorView => {
    currentDocumentKey = documentKey;
    editorView = new EditorView({
      state: createState(content),
      parent,
    });

    setEditorView(editorView);
    reconfigureWidgets(editorView);
    setupWidgetsWatcher(getEditorView);
    setupScrollMarginsWatcher(getEditorView);

    editorView.focus();
    return editorView;
  };

  const destroyView = (): void => {
    const isActiveEditor = editorStore.activeContext?.editorViewGetter === getEditorView;
    if (isActiveEditor) {
      editorStore.clearActiveContext();
    }
    editorView?.destroy();
    editorView = undefined;
    currentDocumentKey = undefined;
    setEditorView(null);
  };

  const updateContent = (content: string): void => {
    if (!editorView) return;

    const currentContent = editorView.state.doc.toString();
    if (currentContent === content) return;

    editorView.dispatch({
      changes: {
        from: 0,
        to: currentContent.length,
        insert: content,
      },
    });
  };

  const syncDocument = (content: string, documentKey?: string): void => {
    if (!editorView) return;

    const isDocumentChanged = documentKey !== undefined && documentKey !== currentDocumentKey;
    const isExternalLoad = !editorView.state.doc.length && content.length > 0;

    if (!isDocumentChanged && !isExternalLoad) {
      updateContent(content);
      return;
    }

    currentDocumentKey = documentKey;
    resetState(content);
    setEditorView(editorView);
    reconfigureWidgets(editorView);
    refreshActiveContext();
  };

  const setReadonly = (value: boolean): void => {
    if (!editorView) return;
    reconfigureReadonly(editorView, value);
    reconfigureWidgets(editorView, value);
  };

  return {
    orgNode,
    getEditorView,
    initView,
    destroyView,
    updateContent,
    syncDocument,
    setReadonly,
  };
};
