import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import { api } from 'src/boot/api';

export interface ActiveContextBridgeOptions {
  editorViewGetter: () => EditorView | undefined;
  filePathGetter?: () => string | undefined;
  getOrgNode: () => OrgNode | null;
}

export const createActiveContextExtensions = (opts: ActiveContextBridgeOptions): Extension[] => {
  const editorStore = api.core.useEditor();

  const cursorTracker: Extension = EditorView.updateListener.of((update) => {
    if (!update.selectionSet) return;
    const { from, to, head } = update.state.selection.main;
    const selection = from !== to ? update.state.sliceDoc(from, to) : '';
    editorStore.updateActiveContext({ cursorPosition: head, selection });
  });

  const focusHandler: Extension = EditorView.domEventHandlers({
    focus: () => {
      editorStore.setActiveContext({
        orgNode: opts.getOrgNode(),
        cursorPosition: 0,
        selection: '',
        editorViewGetter: opts.editorViewGetter,
        filePath: opts.filePathGetter?.(),
        focused: true,
      });
      return false;
    },
    blur: () => {
      editorStore.updateActiveContext({ focused: false });
      return false;
    },
    touchstart: (evt, view) => {
      const { from, to } = view.state.selection.main;
      if (from !== to) evt.stopPropagation();
      return false;
    },
    touchmove: (evt, view) => {
      const { from, to } = view.state.selection.main;
      if (from !== to) evt.stopPropagation();
      return false;
    },
  });

  return [cursorTracker, focusHandler];
};
