import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { BufferViewStateHandle } from 'orgnote-api';

export type CodeMirrorViewState = {
  readonly selection: {
    readonly ranges: readonly {
      readonly anchor: number;
      readonly head: number;
    }[];
    readonly mainIndex: number;
  };
  readonly scroll: {
    readonly top: number;
    readonly left: number;
  };
};

const clampPosition = (position: number, documentLength: number): number =>
  Math.min(Math.max(position, 0), documentLength);

export const captureCodeMirrorViewState = (view: EditorView): CodeMirrorViewState => ({
  selection: {
    ranges: view.state.selection.ranges.map(({ anchor, head }) => ({ anchor, head })),
    mainIndex: view.state.selection.mainIndex,
  },
  scroll: {
    top: view.scrollDOM.scrollTop,
    left: view.scrollDOM.scrollLeft,
  },
});

const createSelection = (view: EditorView, state: CodeMirrorViewState): EditorSelection => {
  const documentLength = view.state.doc.length;
  const ranges = state.selection.ranges.map(({ anchor, head }) =>
    EditorSelection.range(
      clampPosition(anchor, documentLength),
      clampPosition(head, documentLength),
    ),
  );
  const availableRanges = ranges.length ? ranges : [EditorSelection.cursor(0)];
  const mainIndex = Math.min(Math.max(state.selection.mainIndex, 0), availableRanges.length - 1);
  return EditorSelection.create(availableRanges, mainIndex);
};

export const restoreCodeMirrorViewState = (
  view: EditorView,
  state: CodeMirrorViewState,
): void => {
  view.dispatch({ selection: createSelection(view, state) });
  const restoreScroll = (): void => {
    view.scrollDOM.scrollTop = state.scroll.top;
    view.scrollDOM.scrollLeft = state.scroll.left;
  };
  restoreScroll();
  view.requestMeasure({ read: () => undefined, write: restoreScroll });
};

export const saveCodeMirrorViewState = (
  view: EditorView | undefined,
  handle: BufferViewStateHandle<CodeMirrorViewState> | undefined,
): void => {
  if (!view || !handle) return;
  handle.set(captureCodeMirrorViewState(view));
};

export const restoreCodeMirrorViewStateFromHandle = (
  view: EditorView,
  handle: BufferViewStateHandle<CodeMirrorViewState> | undefined,
): boolean => {
  const state = handle?.get();
  if (!state) return false;
  const shouldRefocus = view.hasFocus;
  if (shouldRefocus) view.contentDOM.blur();
  restoreCodeMirrorViewState(view, state);
  if (shouldRefocus) view.focus();
  return true;
};
