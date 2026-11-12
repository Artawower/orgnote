import { expect, test } from 'vitest';
import { parse, NodeType } from 'org-mode-ast';
import {
  collectAllHeadlines,
  findHeadlineAt,
} from '../shared/find-headline-at';

test('findHeadlineAt_returnsDeepest_inThreeLevelNesting', () => {
  const content = '* L1\n** L2\n*** L3\nbody\n';
  const root = parse(content);
  const found = findHeadlineAt(root, content.indexOf('*** L3'));
  expect(found?.level).toBe(3);
});

test('findHeadlineAt_returnsL2_whenOffsetInL2BodyBeforeL3', () => {
  const content = '* L1\n** L2\nbody of L2\n*** L3\n';
  const root = parse(content);
  const found = findHeadlineAt(root, content.indexOf('body of L2'));
  expect(found?.level).toBe(2);
});

test('findHeadlineAt_matchesHeadline_atStartOffset', () => {
  const content = '* First\n* Second\n';
  const root = parse(content);
  const found = findHeadlineAt(root, content.indexOf('* Second'));
  expect(found?.title?.rawValue.trim()).toBe('* Second');
});

test('findHeadlineAt_returnsUndefined_whenOffsetBeyondAll', () => {
  const content = '* TODO Task\n';
  const root = parse(content);
  expect(findHeadlineAt(root, content.length + 10)).toBeUndefined();
});

test('findHeadlineAt_returnsUndefined_whenNoHeadlines', () => {
  const root = parse('Just some text\nNo headlines here\n');
  expect(findHeadlineAt(root, 0)).toBeUndefined();
});

test('findHeadlineAt_returnsUndefined_forEmptyDocument', () => {
  const root = parse('');
  expect(findHeadlineAt(root, 0)).toBeUndefined();
});

test('collectAllHeadlines_returnsEmptyArray_whenNoHeadlines', () => {
  expect(collectAllHeadlines(parse('Just text\n'))).toEqual([]);
});

test('collectAllHeadlines_returnsFlatList_ofTopLevelHeadlines', () => {
  const root = parse('* A\n* B\n* C\n');
  const headlines = collectAllHeadlines(root);
  expect(headlines).toHaveLength(3);
  expect(headlines.every((h) => h.is(NodeType.Headline))).toBe(true);
});

test('collectAllHeadlines_includesNested_inDepthFirstOrder', () => {
  const root = parse('* A\n** A1\n** A2\n*** A2a\n* B\n');
  const headlines = collectAllHeadlines(root);
  expect(headlines.map((h) => h.level)).toEqual([1, 2, 2, 3, 1]);
});
