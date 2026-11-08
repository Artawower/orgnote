import type { EditorView } from '@codemirror/view';
import type { BufferViewStateHandle } from 'orgnote-api';
import { onBeforeUnmount, watch } from 'vue';
import {
  restoreCodeMirrorViewStateFromHandle,
  saveCodeMirrorViewState,
  type CodeMirrorViewState,
} from 'src/utils/editor-view-state';

interface CodeMirrorViewScope {
  readonly content: string | undefined;
  readonly documentKey: string | undefined;
  readonly viewState: BufferViewStateHandle<CodeMirrorViewState> | undefined;
}

interface UseCodeMirrorViewStateOptions {
  readonly contentGetter: () => string | undefined;
  readonly documentKeyGetter: () => string | undefined;
  readonly viewStateGetter: () => BufferViewStateHandle<CodeMirrorViewState> | undefined;
  readonly getEditorView: () => EditorView | undefined;
  readonly syncDocument: (content: string, documentKey?: string) => void;
  readonly destroyView: () => void;
}

const getViewScope = (options: UseCodeMirrorViewStateOptions): CodeMirrorViewScope => ({
  content: options.contentGetter(),
  documentKey: options.documentKeyGetter(),
  viewState: options.viewStateGetter(),
});

const syncViewScope = (
  options: UseCodeMirrorViewStateOptions,
  current: CodeMirrorViewScope,
  previous: CodeMirrorViewScope,
): void => {
  const isScopeChanged =
    current.documentKey !== previous.documentKey || current.viewState !== previous.viewState;
  if (isScopeChanged) saveCodeMirrorViewState(options.getEditorView(), previous.viewState);
  options.syncDocument(current.content ?? '', current.documentKey);
  const view = options.getEditorView();
  if (isScopeChanged && view) restoreCodeMirrorViewStateFromHandle(view, current.viewState);
};

export const useCodeMirrorViewState = (options: UseCodeMirrorViewStateOptions) => {
  const restoreViewState = (view: EditorView): boolean =>
    restoreCodeMirrorViewStateFromHandle(view, options.viewStateGetter());

  const destroyEditor = (): void => {
    saveCodeMirrorViewState(options.getEditorView(), options.viewStateGetter());
    options.destroyView();
  };

  onBeforeUnmount(destroyEditor);
  watch(
    () => getViewScope(options),
    (current, previous) => syncViewScope(options, current, previous),
  );

  return { restoreViewState };
};
