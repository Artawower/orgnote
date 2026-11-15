import { test, expect } from 'vitest';
import { parse, withMetaInfo } from 'org-mode-ast';
import {
  findNodeAtLine,
  getHeadlinePrefix,
  getListItemPrefix,
  getNodePrefix,
  getNodePrefixRange,
  isHeadline,
  isListItem,
  isBulletListItem,
  isNumericListItem,
  isCheckboxListItem,
  isOrderedListItem,
  hasCheckbox,
  isToggleableNode,
} from './org-ast';

const createOrgNode = (doc: string) => withMetaInfo(parse(doc));

test('findNodeAtLine returns headline at line start', () => {
  const orgNode = createOrgNode('* Headline\nsome text');
  const node = findNodeAtLine(orgNode, 0);
  expect(node?.type).toBe('headline');
});

test('findNodeAtLine returns list item at line start', () => {
  const orgNode = createOrgNode('- list item\nmore text');
  const listItem = findNodeAtLine(orgNode, 0);
  expect(listItem?.type).toBe('listItem');
});

test('findNodeAtLine returns undefined for plain text', () => {
  const orgNode = createOrgNode('plain text');
  const node = findNodeAtLine(orgNode, 0);
  expect(node).toBeUndefined();
});

test('findNodeAtLine handles multiline document', () => {
  const doc = 'first line\n- second line\nthird line';
  const orgNode = createOrgNode(doc);
  const node = findNodeAtLine(orgNode, 11);
  expect(node?.type).toBe('listItem');
});

test('findNodeAtLine returns undefined for plain line before headline', () => {
  const doc = 'qweqwe\n* Some title';
  const orgNode = createOrgNode(doc);
  const node = findNodeAtLine(orgNode, 0);
  expect(node).toBeUndefined();
});

test('findNodeAtLine returns undefined for empty orgNode', () => {
  const node = findNodeAtLine(undefined, 0);
  expect(node).toBeUndefined();
});

test('getHeadlinePrefix extracts single star', () => {
  const orgNode = createOrgNode('* Headline');
  const headline = orgNode.children?.first;
  expect(getHeadlinePrefix(headline!)).toBe('* ');
});

test('getHeadlinePrefix extracts multiple stars', () => {
  const orgNode = createOrgNode('*** Deep headline');
  const headline = orgNode.children?.first;
  expect(getHeadlinePrefix(headline!)).toBe('*** ');
});

test('getListItemPrefix extracts bullet prefix', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(getListItemPrefix(listItem!)).toBe('- ');
});

test('getListItemPrefix extracts numeric prefix', () => {
  const orgNode = createOrgNode('1. item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(getListItemPrefix(listItem!)).toBe('1. ');
});

test('getListItemPrefix extracts checkbox prefix', () => {
  const orgNode = createOrgNode('- [ ] task');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(getListItemPrefix(listItem!)).toBe('- [ ] ');
});

test('getListItemPrefix extracts checked checkbox prefix', () => {
  const orgNode = createOrgNode('- [x] done');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(getListItemPrefix(listItem!)).toBe('- [x] ');
});

test('getNodePrefix returns headline prefix for headline', () => {
  const orgNode = createOrgNode('** Headline');
  const headline = orgNode.children?.first;
  expect(getNodePrefix(headline!)).toBe('** ');
});

test('getNodePrefix returns list prefix for list item', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(getNodePrefix(listItem!)).toBe('- ');
});

test('getNodePrefixRange returns correct range for headline', () => {
  const orgNode = createOrgNode('* Headline');
  const headline = orgNode.children?.first;
  const range = getNodePrefixRange(headline!);
  expect(range).toEqual({ from: 0, to: 2 });
});

test('getNodePrefixRange returns correct range for list item', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  const range = getNodePrefixRange(listItem!);
  expect(range).toEqual({ from: 0, to: 2 });
});

test('isHeadline returns true for headline', () => {
  const orgNode = createOrgNode('* Headline');
  const headline = orgNode.children?.first;
  expect(isHeadline(headline!)).toBe(true);
});

test('isHeadline returns false for list item', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isHeadline(listItem!)).toBe(false);
});

test('isListItem returns true for list item', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isListItem(listItem!)).toBe(true);
});

test('isBulletListItem returns true for bullet list', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isBulletListItem(listItem!)).toBe(true);
});

test('isBulletListItem returns false for numeric list', () => {
  const orgNode = createOrgNode('1. item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isBulletListItem(listItem!)).toBe(false);
});

test('isBulletListItem returns false for checkbox list', () => {
  const orgNode = createOrgNode('- [ ] task');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isBulletListItem(listItem!)).toBe(false);
});

test('isNumericListItem returns true for numeric list', () => {
  const orgNode = createOrgNode('1. item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isNumericListItem(listItem!)).toBe(true);
});

test('isNumericListItem returns false for bullet list', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isNumericListItem(listItem!)).toBe(false);
});

test('isCheckboxListItem returns true for checkbox', () => {
  const orgNode = createOrgNode('- [ ] task');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isCheckboxListItem(listItem!)).toBe(true);
});

test('isCheckboxListItem returns false for bullet list', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isCheckboxListItem(listItem!)).toBe(false);
});

test('isOrderedListItem returns true for numbered list', () => {
  const orgNode = createOrgNode('1. item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isOrderedListItem(listItem!)).toBe(true);
});

test('hasCheckbox returns true for checkbox item', () => {
  const orgNode = createOrgNode('- [X] done');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(hasCheckbox(listItem!)).toBe(true);
});

test('isToggleableNode returns true for headline', () => {
  const orgNode = createOrgNode('* Headline');
  const headline = orgNode.children?.first;
  expect(isToggleableNode(headline!)).toBe(true);
});

test('isToggleableNode returns true for list item', () => {
  const orgNode = createOrgNode('- item');
  const list = orgNode.children?.first;
  const listItem = list?.children?.first;
  expect(isToggleableNode(listItem!)).toBe(true);
});
