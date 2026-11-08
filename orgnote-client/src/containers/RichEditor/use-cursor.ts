import type { EditorView } from '@codemirror/view';

export const setCursorToEOF = (editorView: EditorView | undefined): void => {
  if (!editorView) return;

  const lastLine = editorView.state.doc.lineAt(editorView.state.doc.length);
  editorView.dispatch({
    selection: {
      anchor: lastLine.to,
      head: lastLine.to,
    },
  });
};

export const scrollIntoCurrentLine = (editorView: EditorView | undefined): void => {
  if (!editorView) return;

  window.scroll(0, -1);
  editorView.dispatch({
    selection: {
      anchor: editorView.state.selection.main.head,
      head: editorView.state.selection.main.head,
    },
    scrollIntoView: true,
  });
};
