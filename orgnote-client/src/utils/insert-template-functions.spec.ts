import { test, expect, vi, beforeEach } from 'vitest';
import { insertTemplate } from './editor-primitives';
import { createMockView, getDispatchCall } from '../../test/editor-test-helpers';

beforeEach(() => {
  vi.useFakeTimers();
});

test('insertTemplate inserts template at cursor position', () => {
  const { view, dispatchCalls } = createMockView('hello world', 5);

  insertTemplate(view, { template: '**' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 5,
    to: 5,
    insert: '**',
  });
});

test('insertTemplate places cursor at end of template by default', () => {
  const { view, dispatchCalls } = createMockView('hello world', 5);

  insertTemplate(view, { template: '**' });

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 7,
    head: 7,
  });
});

test('insertTemplate respects focusOffset', () => {
  const { view, dispatchCalls } = createMockView('hello world', 5);

  insertTemplate(view, { template: '**', focusOffset: 1 });

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 6,
    head: 6,
  });
});

test('insertTemplate overrideLine replaces entire line', () => {
  const { view, dispatchCalls } = createMockView('hello world', 5);

  insertTemplate(view, { template: '* ', overrideLine: true });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 11,
    insert: '* ',
  });
});

test('insertTemplate overrideLine works with multiline document', () => {
  const doc = 'first line\nsecond line\nthird line';
  const { view, dispatchCalls } = createMockView(doc, 15);

  insertTemplate(view, { template: '* ', overrideLine: true });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 11,
    to: 22,
    insert: '* ',
  });
});

test('insertTemplate calls focus after requestAnimationFrame', () => {
  const { view } = createMockView('hello', 0);

  insertTemplate(view, { template: 'test' });

  expect(view.focus).not.toHaveBeenCalled();

  vi.runAllTimers();

  expect(view.focus).toHaveBeenCalled();
});

test('insertTemplate inline wrap mode wraps selected text with bold markers', () => {
  const { view, dispatchCalls } = createMockView('hello world', 0, 5);

  insertTemplate(view, { template: '**', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 5,
    insert: '*hello*',
  });
});

test('insertTemplate inline wrap mode preserves selection on wrapped text', () => {
  const { view, dispatchCalls } = createMockView('hello world', 0, 5);

  insertTemplate(view, { template: '**', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 1,
    head: 6,
  });
});

test('insertTemplate inline wrap mode works with italic markers', () => {
  const { view, dispatchCalls } = createMockView('some text here', 5, 9);

  insertTemplate(view, { template: '//', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 5,
    to: 9,
    insert: '/text/',
  });
});

test('insertTemplate inline wrap mode works with strikethrough markers', () => {
  const { view, dispatchCalls } = createMockView('delete this word', 7, 11);

  insertTemplate(view, { template: '++', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 7,
    to: 11,
    insert: '+this+',
  });
});

test('insertTemplate inline wrap mode works with inline code markers', () => {
  const { view, dispatchCalls } = createMockView('run command here', 4, 11);

  insertTemplate(view, { template: '~~', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 4,
    to: 11,
    insert: '~command~',
  });
});

test('insertTemplate inline wrap mode falls back to default when no selection', () => {
  const { view, dispatchCalls } = createMockView('hello world', 5, 5);

  insertTemplate(view, { template: '**', focusOffset: 1, wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 5,
    to: 5,
    insert: '**',
  });
  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 6,
    head: 6,
  });
});

test('insertTemplate inline wrap mode handles empty selection at cursor', () => {
  const { view, dispatchCalls } = createMockView('text', 2);

  insertTemplate(view, { template: '**', focusOffset: 1, wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 2,
    to: 2,
    insert: '**',
  });
});

test('insertTemplate inline wrap mode handles single character selection', () => {
  const { view, dispatchCalls } = createMockView('abc', 1, 2);

  insertTemplate(view, { template: '**', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 1,
    to: 2,
    insert: '*b*',
  });
});

test('insertTemplate inline wrap mode handles selection with spaces', () => {
  const { view, dispatchCalls } = createMockView('hello beautiful world', 6, 15);

  insertTemplate(view, { template: '**', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 6,
    to: 15,
    insert: '*beautiful*',
  });
});

test('insertTemplate block wrap mode inserts selection inside code block', () => {
  const { view, dispatchCalls } = createMockView('console.log("hello")', 0, 20);

  insertTemplate(view, {
    template: '#+BEGIN_SRC \n\n#+END_SRC',
    wrapSelection: 'block',
    selectionInsertOffset: 13,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 20,
    insert: '#+BEGIN_SRC \nconsole.log("hello")\n#+END_SRC',
  });
});

test('insertTemplate block wrap mode preserves selection on inserted text', () => {
  const { view, dispatchCalls } = createMockView('my code', 0, 7);

  insertTemplate(view, {
    template: '#+BEGIN_SRC \n\n#+END_SRC',
    wrapSelection: 'block',
    selectionInsertOffset: 13,
  });

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 13,
    head: 20,
  });
});

test('insertTemplate block wrap mode works with quote block', () => {
  const { view, dispatchCalls } = createMockView('famous quote', 0, 12);

  insertTemplate(view, {
    template: '#+BEGIN_QUOTE\n\n#+END_QUOTE',
    wrapSelection: 'block',
    selectionInsertOffset: 14,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 12,
    insert: '#+BEGIN_QUOTE\nfamous quote\n#+END_QUOTE',
  });
});

test('insertTemplate block wrap mode works with latex block', () => {
  const { view, dispatchCalls } = createMockView('E = mc^2', 0, 8);

  insertTemplate(view, {
    template: '#+BEGIN_EXPORT latex\n\n#+END_EXPORT',
    wrapSelection: 'block',
    selectionInsertOffset: 21,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 8,
    insert: '#+BEGIN_EXPORT latex\nE = mc^2\n#+END_EXPORT',
  });
});

test('insertTemplate block wrap mode works with html block', () => {
  const { view, dispatchCalls } = createMockView('<div>content</div>', 0, 18);

  insertTemplate(view, {
    template: '#+BEGIN_HTML\n\n#+END_HTML',
    wrapSelection: 'block',
    selectionInsertOffset: 13,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 18,
    insert: '#+BEGIN_HTML\n<div>content</div>\n#+END_HTML',
  });
});

test('insertTemplate block wrap mode uses focusOffset when selectionInsertOffset not provided', () => {
  const { view, dispatchCalls } = createMockView('text', 0, 4);

  insertTemplate(view, {
    template: '#+BEGIN_SRC \n\n#+END_SRC',
    wrapSelection: 'block',
    focusOffset: 13,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 4,
    insert: '#+BEGIN_SRC \ntext\n#+END_SRC',
  });
});

test('insertTemplate block wrap mode falls back to default when no selection', () => {
  const { view, dispatchCalls } = createMockView('hello world', 5, 5);

  insertTemplate(view, {
    template: '#+BEGIN_SRC \n\n#+END_SRC',
    focusOffset: 12,
    wrapSelection: 'block',
    selectionInsertOffset: 13,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 5,
    to: 5,
    insert: '#+BEGIN_SRC \n\n#+END_SRC',
  });
});

test('insertTemplate block wrap mode with overrideLine replaces entire line', () => {
  const doc = 'first line\ncode here\nthird line';
  const { view, dispatchCalls } = createMockView(doc, 11, 20);

  insertTemplate(view, {
    template: '#+BEGIN_SRC \n\n#+END_SRC',
    wrapSelection: 'block',
    selectionInsertOffset: 13,
    overrideLine: true,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 11,
    to: 20,
    insert: '#+BEGIN_SRC \ncode here\n#+END_SRC',
  });
});

test('insertTemplate block wrap mode handles multiline selection', () => {
  const selectedText = 'line 1\nline 2\nline 3';
  const doc = `before\n${selectedText}\nafter`;
  const { view, dispatchCalls } = createMockView(doc, 7, 7 + selectedText.length);

  insertTemplate(view, {
    template: '#+BEGIN_QUOTE\n\n#+END_QUOTE',
    wrapSelection: 'block',
    selectionInsertOffset: 14,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 7,
    to: 27,
    insert: '#+BEGIN_QUOTE\nline 1\nline 2\nline 3\n#+END_QUOTE',
  });
});

test('insertTemplate handles empty document', () => {
  const { view, dispatchCalls } = createMockView('', 0);

  insertTemplate(view, { template: '* Heading' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 0,
    insert: '* Heading',
  });
});

test('insertTemplate handles selection at document start', () => {
  const { view, dispatchCalls } = createMockView('hello', 0, 5);

  insertTemplate(view, { template: '**', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 5,
    insert: '*hello*',
  });
});

test('insertTemplate handles selection at document end', () => {
  const { view, dispatchCalls } = createMockView('hello', 0, 5);

  insertTemplate(view, { template: '**', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes?.insert).toBe('*hello*');
});

test('insertTemplate handles unicode text in selection', () => {
  const { view, dispatchCalls } = createMockView('привет мир', 0, 6);

  insertTemplate(view, { template: '**', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 6,
    insert: '*привет*',
  });
});

test('insertTemplate handles emoji in selection', () => {
  const { view, dispatchCalls } = createMockView('hello 🎉 world', 6, 8);

  insertTemplate(view, { template: '**', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 6,
    to: 8,
    insert: '*🎉*',
  });
});

test('insertTemplate block mode handles empty selection with zero offset', () => {
  const { view, dispatchCalls } = createMockView('test', 0, 0);

  insertTemplate(view, {
    template: '#+BEGIN_SRC\n\n#+END_SRC',
    wrapSelection: 'block',
    selectionInsertOffset: 12,
    focusOffset: 12,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 0,
    insert: '#+BEGIN_SRC\n\n#+END_SRC',
  });
});

test('insertTemplate inline mode with four-char template like verbatim', () => {
  const { view, dispatchCalls } = createMockView('hello world', 0, 5);

  insertTemplate(view, { template: '====', wrapSelection: 'inline' });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 5,
    insert: '==hello==',
  });
});

test('insertTemplate scenario: make word bold in middle of text', () => {
  const doc = 'This is important text here';
  const { view, dispatchCalls } = createMockView(doc, 8, 17);

  insertTemplate(view, { template: '**', wrapSelection: 'inline' });

  const call = getDispatchCall(dispatchCalls, 0);
  expect(call.changes?.insert).toBe('*important*');
  expect(call.selection?.anchor).toBe(9);
  expect(call.selection?.head).toBe(18);
});

test('insertTemplate scenario: wrap code snippet in src block', () => {
  const code = 'const x = 42;';
  const { view, dispatchCalls } = createMockView(code, 0, code.length);

  insertTemplate(view, {
    template: '#+BEGIN_SRC js\n\n#+END_SRC',
    wrapSelection: 'block',
    selectionInsertOffset: 15,
  });

  expect(getDispatchCall(dispatchCalls, 0).changes?.insert).toBe('#+BEGIN_SRC js\nconst x = 42;\n#+END_SRC');
});

test('insertTemplate scenario: insert link template without selection', () => {
  const { view, dispatchCalls } = createMockView('Check this out: ', 16);

  insertTemplate(view, { template: '[[url][description]]', focusOffset: 2 });

  expect(getDispatchCall(dispatchCalls, 0).changes?.insert).toBe('[[url][description]]');
  expect(getDispatchCall(dispatchCalls, 0).selection?.anchor).toBe(18);
});

test('insertTemplate scenario: create headline replacing current line', () => {
  const doc = 'some random text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  insertTemplate(view, { template: '* TODO ', overrideLine: true });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 16,
    insert: '* TODO ',
  });
});

test('insertTemplate prependToLine inserts at line start without replacing content', () => {
  const doc = 'existing text here';
  const { view, dispatchCalls } = createMockView(doc, 10);

  insertTemplate(view, { template: '* ', prependToLine: true });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 0,
    insert: '* ',
  });
});

test('insertTemplate prependToLine places cursor at end of line', () => {
  const doc = 'some text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  insertTemplate(view, { template: '- ', prependToLine: true });

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 11,
    head: 11,
  });
});

test('insertTemplate prependToLine works with multiline document', () => {
  const doc = 'first line\nsecond line\nthird line';
  const { view, dispatchCalls } = createMockView(doc, 15);

  insertTemplate(view, { template: '1. ', prependToLine: true });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 11,
    to: 11,
    insert: '1. ',
  });
  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 25,
    head: 25,
  });
});

test('insertTemplate prependToLine works at document start', () => {
  const doc = 'hello world';
  const { view, dispatchCalls } = createMockView(doc, 0);

  insertTemplate(view, { template: '- [ ] ', prependToLine: true });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 0,
    insert: '- [ ] ',
  });
});

test('insertTemplate prependToLine preserves existing line content', () => {
  const doc = 'Buy groceries';
  const { view, dispatchCalls } = createMockView(doc, 5);

  insertTemplate(view, { template: '- [ ] ', prependToLine: true });

  const call = getDispatchCall(dispatchCalls, 0);
  expect(call.changes?.from).toBe(0);
  expect(call.changes?.to).toBe(0);
  expect(call.changes?.insert).toBe('- [ ] ');
});

test('insertTemplate prependToLine with cursor at end of line', () => {
  const doc = 'task description';
  const { view, dispatchCalls } = createMockView(doc, 16);

  insertTemplate(view, { template: '* ', prependToLine: true });

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 0,
    insert: '* ',
  });
});

test('insertTemplate focusOffset 0 places cursor at insertion start', () => {
  const { view, dispatchCalls } = createMockView('hello world', 5);

  insertTemplate(view, { template: '[[url]]', focusOffset: 0 });

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 5,
    head: 5,
  });
});

test('insertTemplate without focusOffset places cursor at end of template', () => {
  const { view, dispatchCalls } = createMockView('hello world', 5);

  insertTemplate(view, { template: '[[url]]' });

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 12,
    head: 12,
  });
});
