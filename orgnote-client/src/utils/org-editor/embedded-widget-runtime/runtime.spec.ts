import { EditorState } from '@codemirror/state';
import { expect, test, vi } from 'vitest';
import {
  EMBEDDED_WIDGET_COMMAND,
  EMBEDDED_WIDGET_DIRECTION,
  getEmbeddedWidgetBridge,
} from './index';

const createView = (doc: string, anchor = 0) => {
  const dispatch = vi.fn();
  const focus = vi.fn();
  return {
    state: EditorState.create({ doc, selection: { anchor } }),
    dispatch,
    focus,
  };
};

test('EmbeddedWidgetBridge orders widgets by live document range', () => {
  const view = createView('title\nproperty');
  const bridge = getEmbeddedWidgetBridge(view as never);

  bridge.register({
    id: 'property:6',
    getRange: () => ({ from: 6, to: 14 }),
    focus: () => true,
  });
  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: 5 }),
    focus: () => true,
  });

  expect(bridge.snapshot().map((widget) => widget.id)).toEqual(['title:0', 'property:6']);
});

test('EmbeddedWidgetBridge focuses a registered widget by id', () => {
  const view = createView('title');
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusTitle = vi.fn(() => true);

  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: 5 }),
    focus: focusTitle,
  });

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Focus,
    payload: { id: 'title:0', position: 'end' },
  });

  expect(focused).toBe(true);
  expect(focusTitle).toHaveBeenCalledWith({ position: 'end' });
});

test('EmbeddedWidgetBridge ignores stale unregister for a replaced widget handle', () => {
  const view = createView('title');
  const bridge = getEmbeddedWidgetBridge(view as never);
  const oldFocus = vi.fn(() => true);
  const nextFocus = vi.fn(() => true);

  const unregisterOld = bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: 5 }),
    focus: oldFocus,
  });
  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: 5 }),
    focus: nextFocus,
  });
  unregisterOld();

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Focus,
    payload: { id: 'title:0', position: 'end' },
  });

  expect(focused).toBe(true);
  expect(oldFocus).not.toHaveBeenCalled();
  expect(nextFocus).toHaveBeenCalledWith({ position: 'end' });
});

test('EmbeddedWidgetBridge ignores missing focus targets', () => {
  const view = createView('title');
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusTitle = vi.fn(() => true);

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Focus,
    payload: { id: 'title:0' },
  });

  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: 5 }),
    focus: focusTitle,
  });

  expect(focused).toBe(false);
  expect(focusTitle).not.toHaveBeenCalled();
});

test('EmbeddedWidgetBridge focuses the next widget by document order', () => {
  const view = createView('title\nproperty');
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusTitle = vi.fn(() => true);
  const focusProperty = vi.fn(() => true);

  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: 5 }),
    focus: focusTitle,
  });
  bridge.register({
    id: 'property:6',
    getRange: () => ({ from: 6, to: 14 }),
    focus: focusProperty,
  });

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.FocusAdjacent,
    payload: {
      sourceId: 'title:0',
      direction: EMBEDDED_WIDGET_DIRECTION.Next,
      position: 'start',
    },
  });

  expect(focused).toBe(true);
  expect(focusTitle).not.toHaveBeenCalled();
  expect(focusProperty).toHaveBeenCalledWith({ position: 'start' });
});

test('EmbeddedWidgetBridge focuses the previous widget across blank lines by document order', () => {
  const documentText = '#+TITLE: Hello\n\n:PROPERTIES:\n:END:';
  const propertyStart = '#+TITLE: Hello\n\n'.length;
  const view = createView(documentText);
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusTitle = vi.fn(() => true);

  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: '#+TITLE: Hello'.length }),
    focus: focusTitle,
  });
  bridge.register({
    id: 'property:16',
    getRange: () => ({ from: propertyStart, to: documentText.length }),
    focus: () => true,
  });

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.FocusAdjacent,
    payload: {
      sourceId: 'property:16',
      range: { from: propertyStart, to: documentText.length },
      direction: EMBEDDED_WIDGET_DIRECTION.Previous,
      position: 'end',
    },
  });

  expect(focused).toBe(true);
  expect(focusTitle).toHaveBeenCalledWith({ position: 'end' });
  expect(view.dispatch).not.toHaveBeenCalled();
});

test('EmbeddedWidgetBridge exits to the blank line before the current widget', () => {
  const documentText = '#+TITLE: Hello\n\n:PROPERTIES:\n:END:';
  const propertyStart = '#+TITLE: Hello\n\n'.length;
  const blankLinePosition = '#+TITLE: Hello\n'.length;
  const view = createView(documentText);
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusTitle = vi.fn(() => true);

  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: '#+TITLE: Hello'.length }),
    focus: focusTitle,
  });
  bridge.register({
    id: 'property:16',
    getRange: () => ({ from: propertyStart, to: documentText.length }),
    focus: () => true,
  });

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Exit,
    payload: {
      sourceId: 'property:16',
      range: { from: propertyStart, to: documentText.length },
      direction: EMBEDDED_WIDGET_DIRECTION.Previous,
    },
  });

  expect(focused).toBe(true);
  expect(focusTitle).not.toHaveBeenCalled();
  expect(view.dispatch).toHaveBeenCalledWith({
    selection: { anchor: blankLinePosition },
    scrollIntoView: true,
  });
});

test('EmbeddedWidgetBridge uses explicit command range before source handle range', () => {
  const view = createView('title\nproperty');
  const bridge = getEmbeddedWidgetBridge(view as never);
  const sourceRange = vi.fn(() => {
    throw new Error('source range should not be resolved');
  });
  const targetRange = vi.fn(() => ({ from: 6, to: 14 }));
  const focusProperty = vi.fn(() => true);

  bridge.register({
    id: 'title:0',
    getRange: sourceRange,
    focus: () => true,
  });
  bridge.register({
    id: 'property:6',
    getRange: targetRange,
    focus: focusProperty,
  });

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.FocusAdjacent,
    payload: {
      sourceId: 'title:0',
      range: { from: 0, to: 5 },
      direction: EMBEDDED_WIDGET_DIRECTION.Next,
      position: 'start',
    },
  });

  expect(focused).toBe(true);
  expect(sourceRange).not.toHaveBeenCalled();
  expect(targetRange).toHaveBeenCalledTimes(1);
  expect(focusProperty).toHaveBeenCalledWith({ position: 'start' });
});

test('EmbeddedWidgetBridge exits to the next widget only when it is on the adjacent line', () => {
  const view = createView('title\nproperty');
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusProperty = vi.fn(() => true);

  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: 5 }),
    focus: () => true,
  });
  bridge.register({
    id: 'property:6',
    getRange: () => ({ from: 6, to: 14 }),
    focus: focusProperty,
  });

  const exited = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Exit,
    payload: {
      sourceId: 'title:0',
      direction: EMBEDDED_WIDGET_DIRECTION.Next,
      position: 'start',
    },
  });

  expect(exited).toBe(true);
  expect(focusProperty).toHaveBeenCalledWith({ position: 'start' });
  expect(view.dispatch).not.toHaveBeenCalled();
});

test('EmbeddedWidgetBridge exits to blank line between widgets', () => {
  const documentText = 'title\n\n:PROPERTIES:\n:END:';
  const propertyStart = 'title\n\n'.length;
  const view = createView(documentText);
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusTitle = vi.fn(() => true);

  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: 5 }),
    focus: focusTitle,
  });
  bridge.register({
    id: 'property:7',
    getRange: () => ({ from: propertyStart, to: documentText.length }),
    focus: () => true,
  });

  const exited = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Exit,
    payload: {
      sourceId: 'property:7',
      range: { from: propertyStart, to: documentText.length },
      direction: EMBEDDED_WIDGET_DIRECTION.Previous,
      position: 'end',
    },
  });

  expect(exited).toBe(true);
  expect(focusTitle).not.toHaveBeenCalled();
  expect(view.dispatch).toHaveBeenCalledWith({
    selection: { anchor: 'title\n'.length },
    scrollIntoView: true,
  });
});

test('EmbeddedWidgetBridge appends a line when exiting past the document end', () => {
  const view = createView('title');
  const bridge = getEmbeddedWidgetBridge(view as never);

  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: 5 }),
    focus: () => true,
  });

  const exited = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Exit,
    payload: {
      sourceId: 'title:0',
      direction: EMBEDDED_WIDGET_DIRECTION.Next,
    },
  });

  expect(exited).toBe(true);
  expect(view.dispatch).toHaveBeenCalledWith({
    changes: expect.anything(),
    selection: { anchor: 'title\n'.length },
    scrollIntoView: true,
  });
  expect(view.focus).toHaveBeenCalled();
});

test('EmbeddedWidgetBridge does not jump over regular text from CodeMirror', () => {
  const documentText = 'property\nnormal text\nbody';
  const view = createView(documentText, documentText.length);
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusProperty = vi.fn(() => true);

  bridge.register({
    id: 'property:0',
    getRange: () => ({ from: 0, to: 'property'.length }),
    focus: focusProperty,
  });

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.FocusFromEditor,
    payload: {
      direction: EMBEDDED_WIDGET_DIRECTION.Previous,
      position: 'end',
    },
  });

  expect(focused).toBe(false);
  expect(focusProperty).not.toHaveBeenCalled();
});

test('EmbeddedWidgetBridge focuses previous widget from the blank line below it', () => {
  const documentText = '#+TITLE: Hello\n\n:PROPERTIES:';
  const blankLinePosition = '#+TITLE: Hello\n'.length;
  const view = createView(documentText, blankLinePosition);
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusTitle = vi.fn(() => true);

  bridge.register({
    id: 'title:0',
    getRange: () => ({ from: 0, to: '#+TITLE: Hello'.length }),
    focus: focusTitle,
  });

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.FocusFromEditor,
    payload: {
      direction: EMBEDDED_WIDGET_DIRECTION.Previous,
      position: 'end',
    },
  });

  expect(focused).toBe(true);
  expect(focusTitle).toHaveBeenCalledWith({ position: 'end' });
});

test('EmbeddedWidgetBridge does not jump over blank lines from CodeMirror', () => {
  const propertyText = ':PROPERTIES:\n:ID: note-id\n:type: note\n:END:';
  const documentText = `${propertyText}\n\n#+DESCRIPTION: Hello world?`;
  const view = createView(documentText, documentText.length);
  const bridge = getEmbeddedWidgetBridge(view as never);
  const focusProperty = vi.fn(() => true);

  bridge.register({
    id: 'property:0',
    getRange: () => ({ from: 0, to: propertyText.length }),
    focus: focusProperty,
  });

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.FocusFromEditor,
    payload: {
      direction: EMBEDDED_WIDGET_DIRECTION.Previous,
      position: 'end',
    },
  });

  expect(focused).toBe(false);
  expect(focusProperty).not.toHaveBeenCalled();
});
