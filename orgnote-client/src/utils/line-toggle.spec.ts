import { test, expect } from 'vitest';
import { parse, withMetaInfo } from 'org-mode-ast';
import {
  createLineToggle,
  isHeadline,
  isBulletList,
  isNumericList,
  isCheckboxList,
} from './line-toggle';
import { createMockView, getDispatchCall } from '../../test/editor-test-helpers';

globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(cb, 0) as unknown as number;

const createOrgNode = (doc: string) => withMetaInfo(parse(doc));

test('createLineToggle inserts headline on empty line', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('* ', isHeadline);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 0,
    insert: '* ',
  });
});

test('createLineToggle removes headline when already headline', () => {
  const doc = '* existing headline';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('* ', isHeadline);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 2,
    insert: '',
  });
});

test('createLineToggle replaces bullet list with headline', () => {
  const doc = '- list item';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('* ', isHeadline);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 2,
    insert: '* ',
  });
});

test('createLineToggle replaces headline with bullet list', () => {
  const doc = '* headline text';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('- ', isBulletList);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 2,
    insert: '- ',
  });
});

test('createLineToggle removes bullet list when already bullet list', () => {
  const doc = '- list item';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('- ', isBulletList);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 2,
    insert: '',
  });
});

test('createLineToggle replaces bullet list with numeric list', () => {
  const doc = '- list item';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('1. ', isNumericList);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 2,
    insert: '1. ',
  });
});

test('createLineToggle removes numeric list when already numeric', () => {
  const doc = '1. numbered item';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('1. ', isNumericList);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 3,
    insert: '',
  });
});

test('createLineToggle replaces numeric list with bullet list', () => {
  const doc = '1. numbered item';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('- ', isBulletList);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 3,
    insert: '- ',
  });
});

test('createLineToggle inserts checkbox list on plain text', () => {
  const doc = 'task description';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('- [ ] ', isCheckboxList);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 0,
    insert: '- [ ] ',
  });
});

test('createLineToggle removes checkbox when already checkbox', () => {
  const doc = '- [ ] task item';
  const { view, dispatchCalls } = createMockView(doc, 8);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('- [ ] ', isCheckboxList);

  expect(getDispatchCall(dispatchCalls, 0).changes?.insert).toBe('');
});

test('createLineToggle replaces bullet with checkbox', () => {
  const doc = '- simple item';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('- [ ] ', isCheckboxList);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 2,
    insert: '- [ ] ',
  });
});

test('createLineToggle replaces checkbox with bullet', () => {
  const doc = '- [ ] task item';
  const { view, dispatchCalls } = createMockView(doc, 8);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('- ', isBulletList);

  expect(getDispatchCall(dispatchCalls, 0).changes?.insert).toBe('- ');
});

test('createLineToggle works with multiline document', () => {
  const doc = 'first line\n- second line\nthird line';
  const { view, dispatchCalls } = createMockView(doc, 15);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('* ', isHeadline);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 11,
    to: 13,
    insert: '* ',
  });
});

test('createLineToggle places cursor at end of line after insert', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('* ', isHeadline);

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 12,
    head: 12,
  });
});

test('createLineToggle places cursor at end of line after remove', () => {
  const doc = '* headline';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('* ', isHeadline);

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 8,
    head: 8,
  });
});

test('createLineToggle places cursor at end of line after replace', () => {
  const doc = '- list item';
  const { view, dispatchCalls } = createMockView(doc, 5);
  const orgNode = createOrgNode(doc);

  const toggle = createLineToggle(view, orgNode);
  toggle('* ', isHeadline);

  expect(getDispatchCall(dispatchCalls, 0).selection).toEqual({
    anchor: 11,
    head: 11,
  });
});

test('createLineToggle handles undefined orgNode', () => {
  const doc = 'plain text';
  const { view, dispatchCalls } = createMockView(doc, 5);

  const toggle = createLineToggle(view, undefined);
  toggle('* ', isHeadline);

  expect(getDispatchCall(dispatchCalls, 0).changes).toEqual({
    from: 0,
    to: 0,
    insert: '* ',
  });
});

test('isHeadline returns true for headline node', () => {
  const orgNode = createOrgNode('* headline');
  const headline = orgNode.children?.first;
  expect(headline && isHeadline(headline)).toBe(true);
});

test('isBulletList returns true for bullet list item', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(listItem && isBulletList(listItem)).toBe(true);
});

test('isBulletList returns false for numeric list', () => {
  const orgNode = createOrgNode('1. item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(listItem && isBulletList(listItem)).toBe(false);
});

test('isNumericList returns true for numeric list item', () => {
  const orgNode = createOrgNode('1. item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(listItem && isNumericList(listItem)).toBe(true);
});

test('isCheckboxList returns true for checkbox item', () => {
  const orgNode = createOrgNode('- [ ] task');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(listItem && isCheckboxList(listItem)).toBe(true);
});

test('isCheckboxList returns false for regular bullet', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(listItem && isCheckboxList(listItem)).toBe(false);
});
