import type { OrgNoteApi } from 'orgnote-api';
import { EditorView } from '@codemirror/view';

const POLL_INTERVAL_MS = 50;
const WAIT_TIMEOUT_MS = 3000;

interface NavigateOptions {
  yMargin?: number;
}

const getEditorView = (api: OrgNoteApi): EditorView | undefined =>
  api.core.useEditor().activeContext?.editorViewGetter?.();

export const waitForEditorView = (
  api: OrgNoteApi,
  timeoutMs = WAIT_TIMEOUT_MS,
): Promise<EditorView | null> =>
  new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      const view = getEditorView(api);
      if (view) return resolve(view);
      if (Date.now() >= deadline) return resolve(null);
      setTimeout(poll, POLL_INTERVAL_MS);
    };
    poll();
  });

export const navigateToPosition = (
  view: EditorView,
  position: number,
  options: NavigateOptions = {},
): void => {
  const safePos = Math.min(position, view.state.doc.length);
  requestAnimationFrame(() => {
    view.focus();
    view.dispatch({
      selection: { anchor: safePos, head: safePos },
      effects: EditorView.scrollIntoView(safePos, {
        y: 'start',
        yMargin: options.yMargin ?? 0,
      }),
    });
  });
};

export const openNoteAtPosition = async (
  api: OrgNoteApi,
  path: string,
  position?: number,
): Promise<void> => {
  await api.core.useBufferViewer().open(path);
  if (position === undefined) return;
  const view = await waitForEditorView(api);
  if (!view) return;
  navigateToPosition(view, position);
};
