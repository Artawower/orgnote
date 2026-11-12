import { test, expect } from 'vitest';
import { parse, withMetaInfo } from 'org-mode-ast';
import { collectTocTree, flattenTocTree } from './toc-utils';

test('collectTocTree: returns empty array for document without headlines', () => {
  const orgDoc = withMetaInfo(parse('Just some text'));
  const tree = collectTocTree(orgDoc);

  expect(tree).toEqual([]);
});

test('collectTocTree: skips empty headlines', () => {
  const orgDoc = withMetaInfo(
    parse(`* Valid
* 
*   
* Another valid`),
  );
  const tree = collectTocTree(orgDoc);
  const flat = flattenTocTree(tree);

  expect(flat).toHaveLength(2);
  expect(flat.at(0)?.label).toBe('Valid');
  expect(flat.at(1)?.label).toBe('Another valid');
});

test('collectTocTree: collects single headline', () => {
  const orgDoc = withMetaInfo(parse('* Hello World'));
  const tree = collectTocTree(orgDoc);

  expect(tree).toHaveLength(1);
  expect(tree.at(0)?.label).toBe('Hello World');
  expect(tree.at(0)?.level).toBe(1);
  expect(tree.at(0)?.position).toBe(0);
  expect(tree.at(0)?.endPosition).toBeGreaterThan(0);
});

test('collectTocTree: creates flat list for same-level entries', () => {
  const orgDoc = withMetaInfo(
    parse(`* A
* B
* C`),
  );
  const tree = collectTocTree(orgDoc);

  expect(tree).toHaveLength(3);
  expect(tree.at(0)?.label).toBe('A');
  expect(tree.at(1)?.label).toBe('B');
  expect(tree.at(2)?.label).toBe('C');
  expect(tree.at(0)?.children).toBeUndefined();
});

test('collectTocTree: nests children under parent', () => {
  const orgDoc = withMetaInfo(
    parse(`* Parent
** Child 1
** Child 2`),
  );
  const tree = collectTocTree(orgDoc);

  expect(tree).toHaveLength(1);
  expect(tree.at(0)?.label).toBe('Parent');
  expect(tree.at(0)?.children).toHaveLength(2);
  expect(tree.at(0)?.children?.at(0)?.label).toBe('Child 1');
  expect(tree.at(0)?.children?.at(1)?.label).toBe('Child 2');
});

test('collectTocTree: handles deep nesting', () => {
  const orgDoc = withMetaInfo(
    parse(`* L1
** L2
*** L3`),
  );
  const tree = collectTocTree(orgDoc);

  expect(tree).toHaveLength(1);
  expect(tree.at(0)?.children?.at(0)?.children?.at(0)?.label).toBe('L3');
});

test('collectTocTree: handles sibling after nested children', () => {
  const orgDoc = withMetaInfo(
    parse(`* First
** Child
* Second`),
  );
  const tree = collectTocTree(orgDoc);

  expect(tree).toHaveLength(2);
  expect(tree.at(0)?.label).toBe('First');
  expect(tree.at(0)?.children).toHaveLength(1);
  expect(tree.at(1)?.label).toBe('Second');
  expect(tree.at(1)?.children).toBeUndefined();
});

test('flattenTocTree: returns empty array for empty tree', () => {
  const flat = flattenTocTree([]);
  expect(flat).toEqual([]);
});

test('flattenTocTree: flattens nested structure', () => {
  const orgDoc = withMetaInfo(
    parse(`* A
** B
*** C
* D`),
  );
  const tree = collectTocTree(orgDoc);
  const flat = flattenTocTree(tree);

  expect(flat.map((n) => n.label)).toEqual(['A', 'B', 'C', 'D']);
});

test('flattenTocTree: preserves order', () => {
  const orgDoc = withMetaInfo(
    parse(`* First
* Second
* Third`),
  );
  const tree = collectTocTree(orgDoc);
  const flat = flattenTocTree(tree);
  const [first, second, third] = flat;

  expect(first?.position).toBeLessThan(second?.position ?? 0);
  expect(second?.position).toBeLessThan(third?.position ?? 0);
});
