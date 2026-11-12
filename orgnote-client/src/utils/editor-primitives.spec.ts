import { test, expect } from 'vitest';
import { insertText, deleteRange, replaceRange } from './editor-primitives';
import { createMinimalMockView } from '../../test/editor-test-helpers';

globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(cb, 0) as unknown as number;

test('insertText inserts text at specified position', () => {
  const { view, dispatchCalls } = createMinimalMockView();

  insertText(view, 'hello', 5);

  expect(dispatchCalls[0]?.changes).toEqual({
    from: 5,
    to: 5,
    insert: 'hello',
  });
});

test('insertText moves cursor to end of inserted text', () => {
  const { view, dispatchCalls } = createMinimalMockView();

  insertText(view, 'hello', 5);

  expect(dispatchCalls[0]?.selection).toEqual({
    anchor: 10,
  });
});

test('deleteRange removes text in specified range', () => {
  const { view, dispatchCalls } = createMinimalMockView();

  deleteRange(view, 3, 8);

  expect(dispatchCalls[0]?.changes).toEqual({
    from: 3,
    to: 8,
    insert: '',
  });
});

test('deleteRange moves cursor to from position', () => {
  const { view, dispatchCalls } = createMinimalMockView();

  deleteRange(view, 3, 8);

  expect(dispatchCalls[0]?.selection).toEqual({
    anchor: 3,
  });
});

test('replaceRange replaces text and positions cursor after new text', () => {
  const { view, dispatchCalls } = createMinimalMockView();

  replaceRange(view, 2, 7, 'world');

  expect(dispatchCalls[0]?.changes).toEqual({
    from: 2,
    to: 7,
    insert: 'world',
  });
  expect(dispatchCalls[0]?.selection).toEqual({
    anchor: 7,
  });
});
