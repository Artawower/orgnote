import { test, expect } from 'vitest';
import { parse, withMetaInfo, NodeType, type OrgNode } from 'org-mode-ast';
import {
  PAIRS,
  findPairByOpen,
  isAtLineStart,
  isEscaped,
  hasSpaceOrLineStartBefore,
  isInsideBlock,
  isInsideMarkup,
  isInsideVerbatim,
  isInsideNodeTypes,
} from './pair-rules';

const createMockView = (doc: string) => {
  const lines = doc.split('\n');

  return {
    state: {
      doc: {
        sliceString: (from: number, to: number) => doc.slice(from, to),
        lineAt: (pos: number) => {
          let start = 0;
          for (const line of lines) {
            const end = start + line.length;
            if (pos <= end) {
              return { from: start, to: end, number: 1 };
            }
            start = end + 1;
          }
          return { from: 0, to: doc.length, number: 1 };
        },
      },
    },
  } as never;
};

const createOrgTree = (doc: string): OrgNode => withMetaInfo(parse(doc));

test('PAIRS contains all expected markup symbols', () => {
  const opens = PAIRS.map((p) => p.open);
  expect(opens).toContain('*');
  expect(opens).toContain('/');
  expect(opens).toContain('=');
  expect(opens).toContain('~');
  expect(opens).toContain('+');
  expect(opens).toContain('[');
});

test('findPairByOpen returns correct pair for *', () => {
  const pair = findPairByOpen('*');
  expect(pair?.open).toBe('*');
  expect(pair?.close).toBe('*');
  expect(pair?.checkNotLineStart).toBe(true);
  expect(pair?.nodeType).toBe(NodeType.Bold);
});

test('findPairByOpen returns correct pair for [', () => {
  const pair = findPairByOpen('[');
  expect(pair?.open).toBe('[');
  expect(pair?.close).toBe(']');
  expect(pair?.nodeType).toBeUndefined();
});

test('findPairByOpen returns undefined for unknown symbol', () => {
  expect(findPairByOpen('@')).toBeUndefined();
});

test('isAtLineStart returns true at beginning of line', () => {
  const view = createMockView('hello');
  expect(isAtLineStart(view, 0)).toBe(true);
});

test('isAtLineStart returns true with only whitespace before cursor', () => {
  const view = createMockView('   hello');
  expect(isAtLineStart(view, 3)).toBe(true);
});

test('isAtLineStart returns false with content before cursor', () => {
  const view = createMockView('hello world');
  expect(isAtLineStart(view, 6)).toBe(false);
});

test('isEscaped returns true when backslash before cursor', () => {
  const view = createMockView('\\*');
  expect(isEscaped(view, 1)).toBe(true);
});

test('isEscaped returns false when no backslash before cursor', () => {
  const view = createMockView('a*');
  expect(isEscaped(view, 1)).toBe(false);
});

test('isEscaped returns false at position 0', () => {
  const view = createMockView('*');
  expect(isEscaped(view, 0)).toBe(false);
});

test('hasSpaceOrLineStartBefore returns true at line start', () => {
  const view = createMockView('hello');
  expect(hasSpaceOrLineStartBefore(view, 0)).toBe(true);
});

test('hasSpaceOrLineStartBefore returns true after space', () => {
  const view = createMockView('hello world');
  expect(hasSpaceOrLineStartBefore(view, 6)).toBe(true);
});

test('hasSpaceOrLineStartBefore returns false after letter', () => {
  const view = createMockView('hello');
  expect(hasSpaceOrLineStartBefore(view, 3)).toBe(false);
});

test('isInsideBlock returns true when inside src block', () => {
  const doc = '#+begin_src\ncode\n#+end_src';
  const root = createOrgTree(doc);
  expect(isInsideBlock(root, 15)).toBe(true);
});

test('isInsideBlock returns false when outside block', () => {
  const doc = 'normal text';
  const root = createOrgTree(doc);
  expect(isInsideBlock(root, 5)).toBe(false);
});

test('isInsideBlock returns false for null node', () => {
  expect(isInsideBlock(null, 0)).toBe(false);
});

test('isInsideMarkup returns true when inside bold markup', () => {
  const doc = '*bold* text';
  const root = createOrgTree(doc);
  const pair = findPairByOpen('*')!;
  expect(isInsideMarkup(root, 3, pair)).toBe(true);
});

test('isInsideMarkup returns false when outside markup', () => {
  const doc = '*bold* text';
  const root = createOrgTree(doc);
  const pair = findPairByOpen('*')!;
  expect(isInsideMarkup(root, 10, pair)).toBe(false);
});

test('isInsideMarkup returns false for asymmetric pairs', () => {
  const doc = '[[link]]';
  const root = createOrgTree(doc);
  const pair = findPairByOpen('[')!;
  expect(isInsideMarkup(root, 3, pair)).toBe(false);
});

test('isInsideMarkup detects italic', () => {
  const doc = '/italic/ text';
  const root = createOrgTree(doc);
  const pair = findPairByOpen('/')!;
  expect(isInsideMarkup(root, 4, pair)).toBe(true);
});

test('isInsideNodeTypes works with multiple types', () => {
  const doc = '*bold* /italic/';
  const root = createOrgTree(doc);
  expect(isInsideNodeTypes(root, 3, [NodeType.Bold, NodeType.Italic])).toBe(true);
  expect(isInsideNodeTypes(root, 10, [NodeType.Bold, NodeType.Italic])).toBe(true);
  expect(isInsideNodeTypes(root, 7, [NodeType.Bold, NodeType.Italic])).toBe(false);
});

test('isInsideVerbatim returns true inside verbatim node', () => {
  const doc = 'text =verbatim= more';
  const root = createOrgTree(doc);
  expect(isInsideVerbatim(root, 7)).toBe(true);
});

test('isInsideVerbatim returns true inside inline code node', () => {
  const doc = 'text ~code~ more';
  const root = createOrgTree(doc);
  expect(isInsideVerbatim(root, 7)).toBe(true);
});

test('isInsideVerbatim returns false outside verbatim', () => {
  const doc = 'text =verbatim= more';
  const root = createOrgTree(doc);
  expect(isInsideVerbatim(root, 18)).toBe(false);
});

test('isInsideVerbatim returns false for null node', () => {
  expect(isInsideVerbatim(null, 0)).toBe(false);
});


