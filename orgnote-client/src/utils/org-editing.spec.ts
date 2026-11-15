import { test, expect } from 'vitest';
import { parse, withMetaInfo } from 'org-mode-ast';
import { createOrgEditing } from './org-editing';
import { createMockView } from '../../test/editor-test-helpers';

globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(cb, 0) as unknown as number;

const createOrgNode = (doc: string) => withMetaInfo(parse(doc));

test('createOrgEditing bold inserts asterisks', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.bold();

  expect(dispatchCalls[0]?.changes?.insert).toBe('**');
});

test('createOrgEditing bold wraps selection', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 0, 5);

  const editor = createOrgEditing(view);
  editor.bold();

  expect(dispatchCalls[0]?.changes?.insert).toBe('*plain*');
});

test('createOrgEditing italic inserts slashes', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.italic();

  expect(dispatchCalls[0]?.changes?.insert).toBe('//');
});

test('createOrgEditing strikethrough inserts plus signs', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.strikethrough();

  expect(dispatchCalls[0]?.changes?.insert).toBe('++');
});

test('createOrgEditing code inserts tildes', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.code();

  expect(dispatchCalls[0]?.changes?.insert).toBe('~~');
});

test('createOrgEditing underline inserts underscores', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.underline();

  expect(dispatchCalls[0]?.changes?.insert).toBe('__');
});

test('createOrgEditing insertHeadline prepends headline prefix', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertHeadline();

  expect(dispatchCalls[0]?.changes).toEqual({
    from: 0,
    to: 0,
    insert: '* ',
  });
});

test('createOrgEditing toggleHeadline removes headline prefix', () => {
  const doc = '* headline';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const editor = createOrgEditing(view, orgNode);
  editor.toggleHeadline();

  expect(dispatchCalls[0]?.changes?.insert).toBe('');
  expect(dispatchCalls[0]?.changes?.from).toBe(0);
  expect(dispatchCalls[0]?.changes?.to).toBe(2);
});

test('createOrgEditing toggleHeadline places cursor at end of line after remove', () => {
  const doc = '* headline';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const editor = createOrgEditing(view, orgNode);
  editor.toggleHeadline();

  expect(dispatchCalls[1]?.selection).toEqual({ anchor: 8, head: 8 });
});

test('createOrgEditing toggleHeadline inserts prefix on plain text', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const editor = createOrgEditing(view, orgNode);
  editor.toggleHeadline();

  expect(dispatchCalls[0]?.changes?.insert).toBe('* ');
});

test('createOrgEditing toggleHeadline should not affect headline when cursor is on different line', () => {
  const doc = '* Title\n\nAnother text';
  const caretPos = 9;
  const { view, dispatchCalls } = createMockView(doc, caretPos);
  const orgNode = createOrgNode(doc);

  const editor = createOrgEditing(view, orgNode);
  editor.toggleHeadline();

  const firstChange = dispatchCalls[0]?.changes;
  if (firstChange) {
    const touchesFirstLineHeadline = firstChange.from <= 2 && firstChange.to >= 0;
    expect(touchesFirstLineHeadline).toBe(false);
  }
});

test('createOrgEditing toggleHeadline prepends current line instead of removing next headline prefix', () => {
  const doc = 'qweqwe\n* Some title';
  const caretPos = 6;
  const { view, dispatchCalls } = createMockView(doc, caretPos);
  const orgNode = createOrgNode(doc);

  const editor = createOrgEditing(view, orgNode);
  editor.toggleHeadline();

  expect(dispatchCalls[0]?.changes).toEqual({
    from: 0,
    to: 0,
    insert: '* ',
  });
});

test('createOrgEditing toggleBulletList removes bullet prefix', () => {
  const doc = '- list item';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const editor = createOrgEditing(view, orgNode);
  editor.toggleBulletList();

  expect(dispatchCalls[0]?.changes?.insert).toBe('');
});

test('createOrgEditing toggleBulletList replaces headline with bullet', () => {
  const doc = '* headline';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const editor = createOrgEditing(view, orgNode);
  editor.toggleBulletList();

  expect(dispatchCalls[0]?.changes?.insert).toBe('- ');
});

test('createOrgEditing insertCodeBlock inserts src block', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertCodeBlock();

  expect(dispatchCalls[0]?.changes?.insert).toContain('#+BEGIN_SRC');
  expect(dispatchCalls[0]?.changes?.insert).toContain('#+END_SRC');
});

test('createOrgEditing insertCodeBlock with language', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertCodeBlock('typescript');

  expect(dispatchCalls[0]?.changes?.insert).toContain('#+BEGIN_SRC typescript');
});

test('createOrgEditing insertQuote inserts quote block', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertQuote();

  expect(dispatchCalls[0]?.changes?.insert).toContain('#+BEGIN_QUOTE');
  expect(dispatchCalls[0]?.changes?.insert).toContain('#+END_QUOTE');
});

test('createOrgEditing insertLatex inserts latex export block', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertLatex();

  expect(dispatchCalls[0]?.changes?.insert).toContain('#+BEGIN_EXPORT latex');
});

test('createOrgEditing insertHtmlBlock inserts html block', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertHtmlBlock();

  expect(dispatchCalls[0]?.changes?.insert).toContain('#+BEGIN_HTML');
});

test('createOrgEditing insertHorizontalRule inserts rule', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertHorizontalRule();

  expect(dispatchCalls[0]?.changes?.insert).toBe('-----\n');
});

test('createOrgEditing insertLink inserts empty link', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertLink();

  expect(dispatchCalls[0]?.changes?.insert).toBe('[[][]]');
});

test('createOrgEditing insertLink inserts link with url', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertLink('https://example.com');

  expect(dispatchCalls[0]?.changes?.insert).toBe('[[https://example.com][]]');
});

test('createOrgEditing insertInternalLink inserts id link', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertInternalLink('abc123', 'My Note');

  expect(dispatchCalls[0]?.changes?.insert).toBe('[[id:abc123][My Note]]');
});

test('createOrgEditing insertImage inserts image link', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertImage('photo.png');

  expect(dispatchCalls[0]?.changes?.insert).toBe('[[./photo.png]]');
});

test('createOrgEditing insertTable inserts table start', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertTable();

  expect(dispatchCalls[0]?.changes?.insert).toBe('\n| ');
});

test('createOrgEditing insertDatetime inserts formatted date', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const editor = createOrgEditing(view);
  editor.insertDatetime();

  const insert = dispatchCalls[0]?.changes?.insert ?? '';
  expect(insert).toMatch(/^<\d{4}-\d{2}-\d{2} \w+> $/);
});

test('createOrgEditing toggleNumericList works correctly', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const editor = createOrgEditing(view, orgNode);
  editor.toggleNumericList();

  expect(dispatchCalls[0]?.changes?.insert).toBe('1. ');
});

test('createOrgEditing toggleCheckboxList works correctly', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const editor = createOrgEditing(view, orgNode);
  editor.toggleCheckboxList();

  expect(dispatchCalls[0]?.changes?.insert).toBe('- [ ] ');
});
