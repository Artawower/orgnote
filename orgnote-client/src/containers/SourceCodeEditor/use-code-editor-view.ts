import { EditorView } from '@codemirror/view';
import { useCodeEditorState, type UseCodeEditorStateOptions } from './use-code-editor-state';

export type UseCodeEditorViewOptions = Omit<UseCodeEditorStateOptions, 'editorViewGetter'>;

export const useCodeEditorView = (options: UseCodeEditorViewOptions) => {
  let editorView: EditorView | undefined;
  let currentDocumentKey: string | undefined;

  const getEditorView = () => editorView;

  const { createState, reconfigureReadonly, reconfigureLanguage, reconfigureTheme } =
    useCodeEditorState({
      ...options,
      editorViewGetter: getEditorView,
    });

  const resetState = (content: string): void => {
    if (!editorView) return;
    editorView.setState(createState(content));
  };

  const initView = (parent: HTMLElement, content: string, documentKey?: string): EditorView => {
    currentDocumentKey = documentKey;
    editorView = new EditorView({
      state: createState(content),
      parent,
    });

    editorView.focus();
    return editorView;
  };

  const destroyView = (): void => {
    editorView?.destroy();
    editorView = undefined;
    currentDocumentKey = undefined;
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
  };

  const setReadonly = (value: boolean): void => {
    if (!editorView) return;
    reconfigureReadonly(editorView, value);
  };

  const setLanguage = (language?: string): void => {
    if (!editorView) return;
    reconfigureLanguage(editorView, language);
  };

  const setTheme = (isDark?: boolean): void => {
    if (!editorView) return;
    reconfigureTheme(editorView, isDark);
  };

  return {
    getEditorView,
    initView,
    destroyView,
    updateContent,
    syncDocument,
    setReadonly,
    setLanguage,
    setTheme,
  };
};
