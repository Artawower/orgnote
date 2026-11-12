import { afterEach, beforeEach, expect, test } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  captureCodeMirrorViewState,
  restoreCodeMirrorViewState,
} from './editor-view-state';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

test('captures all CodeMirror selections and scroll offsets', () => {
  const view = new EditorView({
    parent: container,
    state: EditorState.create({
      doc: '0123456789',
      selection: EditorSelection.create([
        EditorSelection.range(2, 4),
        EditorSelection.cursor(8),
      ], 1),
      extensions: [EditorState.allowMultipleSelections.of(true)],
    }),
  });
  view.scrollDOM.scrollTop = 120;
  view.scrollDOM.scrollLeft = 16;

  expect(captureCodeMirrorViewState(view)).toEqual({
    selection: {
      ranges: [
        { anchor: 2, head: 4 },
        { anchor: 8, head: 8 },
      ],
      mainIndex: 1,
    },
    scroll: { top: 120, left: 16 },
  });

  view.destroy();
});

test('restores CodeMirror selection and scroll with document bounds', () => {
  const view = new EditorView({
    parent: container,
    state: EditorState.create({
      doc: 'short',
      extensions: [EditorState.allowMultipleSelections.of(true)],
    }),
  });

  restoreCodeMirrorViewState(view, {
    selection: {
      ranges: [
        { anchor: 2, head: 4 },
        { anchor: 100, head: 100 },
      ],
      mainIndex: 1,
    },
    scroll: { top: 80, left: 12 },
  });

  expect(view.state.selection.ranges.map(({ anchor, head }) => ({ anchor, head }))).toEqual([
    { anchor: 2, head: 4 },
    { anchor: 5, head: 5 },
  ]);
  expect(view.state.selection.mainIndex).toBe(1);
  expect(view.scrollDOM.scrollTop).toBe(80);
  expect(view.scrollDOM.scrollLeft).toBe(12);

  view.destroy();
});
