import { test, expect } from 'vitest';
import { parse, withMetaInfo, walkTree, type OrgNode } from 'org-mode-ast';
import { enterRules } from './enter-rules';

const createOrgTree = (doc: string): OrgNode => withMetaInfo(parse(doc));

const findNodeAtPosition = (root: OrgNode, pos: number): OrgNode | undefined => {
  let exactMatch: OrgNode | undefined;
  let deepestContaining: OrgNode | undefined;

  walkTree(root, (n) => {
    if (n.end === pos) exactMatch = n;
    if (pos >= n.start && pos <= n.end) deepestContaining = n;
    return false;
  });

  return exactMatch ?? deepestContaining;
};

const applyEnterRules = (doc: string, cursorPos: number) => {
  const root = createOrgTree(doc);
  const node = findNodeAtPosition(root, cursorPos);
  if (!node) return undefined;

  for (const rule of enterRules) {
    const transaction = rule(node, cursorPos);
    if (transaction) return transaction;
  }
  return undefined;
};

test('clearEmptyHeadline removes empty headline when cursor after stars', () => {
  const doc = '* ';
  const result = applyEnterRules(doc, 2);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 0, to: 2, insert: '' });
});

test('clearEmptyHeadline does not remove headline with content', () => {
  const doc = '* Hello';
  const result = applyEnterRules(doc, 7);

  expect(result).toBeUndefined();
});

test('newListItem creates new list item after existing item', () => {
  const doc = '- item';
  const result = applyEnterRules(doc, 6);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 6, to: 6, insert: '\n- ' });
});

test('newListItem creates numbered list item with incremented number', () => {
  const doc = '1. first';
  const result = applyEnterRules(doc, 8);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 8, to: 8, insert: '\n2. ' });
});

test('newListItem preserves checkbox in list', () => {
  const doc = '- [ ] task';
  const result = applyEnterRules(doc, 10);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 10, to: 10, insert: '\n- [ ] ' });
});

test('newListItem splits text at cursor and moves remainder to new item', () => {
  const doc = '- Hello world';
  const result = applyEnterRules(doc, 7);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, to: 8, insert: '\n- ' });
  expect(result?.selection).toEqual({ anchor: 10 });
});

test('newListItem splits numbered list and moves remainder to new item', () => {
  const doc = '1. first second';
  const result = applyEnterRules(doc, 8);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 8, to: 9, insert: '\n2. ' });
});

test('newListItem splits checkbox list and moves remainder to new item', () => {
  const doc = '- [ ] hello world';
  const result = applyEnterRules(doc, 11);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 11, to: 12, insert: '\n- [ ] ' });
});

test('newListItem does not consume newline separator before following list item', () => {
  const doc = '- Hello world\n- Another text';
  const result = applyEnterRules(doc, 7);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, to: 8, insert: '\n- ' });
  expect(result?.selection).toEqual({ anchor: 10 });
});

test('newListItem at end of item preserves following list items', () => {
  const doc = '- Hello\n- Another text';
  const result = applyEnterRules(doc, 7);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, to: 7, insert: '\n- ' });
});

test('exitList removes empty list item', () => {
  const doc = '- item\n- ';
  const result = applyEnterRules(doc, 9);

  expect(result).toBeDefined();
});

test('blockFooter adds end block after begin', () => {
  const doc = '#+begin_src';
  const result = applyEnterRules(doc, 11);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 11, insert: '\n\n#+end_src' });
});

test('newTableRow creates new row in table', () => {
  const doc = '| a | b |';
  const result = applyEnterRules(doc, 9);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 9, insert: '\n|  |' });
});

test('exitEmptyTableRow removes empty table row', () => {
  const doc = '| a |\n|  |';
  const root = createOrgTree(doc);
  const node = findNodeAtPosition(root, 9);

  expect(node).toBeDefined();

  let transaction;
  for (const rule of enterRules) {
    transaction = rule(node!, 9);
    if (transaction) break;
  }

  expect(transaction).toBeDefined();
});

test('exitBlockOnNewLine exits src block on empty line after content', () => {
  const doc = '#+begin_src js\nconsole.log("test")\n\n#+end_src';
  const result = applyEnterRules(doc, 36);

  expect(result).toBeDefined();
  expect(result?.changes).toContainEqual({ from: 35, to: 36, insert: '' });
});

test('exitBlockOnNewLine exits quote block on empty line', () => {
  const doc = '#+begin_quote\nsome text\n\n#+end_quote';
  const result = applyEnterRules(doc, 25);

  expect(result).toBeDefined();
});

test('exitBlockOnEmptyLines exits when multiple empty lines at end of content', () => {
  const doc = '#+begin_src python\nprint\n\n#+end_src';
  const result = applyEnterRules(doc, 26);

  expect(result).toBeDefined();
});

test('clearEmptyHeadline removes multi-level empty headline', () => {
  const doc = '** ';
  const result = applyEnterRules(doc, 3);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 0, to: 3, insert: '' });
  expect(result?.selection).toEqual({ anchor: 0 });
});

test('clearEmptyHeadline removes headline with only whitespace after stars', () => {
  const doc = '*  ';
  const result = applyEnterRules(doc, 2);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 0, to: 3, insert: '' });
});

test('clearEmptyHeadline does not trigger for non-headline context', () => {
  const doc = 'plain text';
  const result = applyEnterRules(doc, 10);

  expect(result).toBeUndefined();
});

test('exitList removes empty numbered list item', () => {
  const doc = '1. first\n1. ';
  const result = applyEnterRules(doc, 12);

  expect(result).toBeDefined();
  expect(result?.changes).toHaveProperty('insert', '\n');
});

test('exitList removes empty checkbox list item', () => {
  const doc = '- [ ] task\n- [ ] ';
  const result = applyEnterRules(doc, 17);

  expect(result).toBeDefined();
  expect(result?.changes).toHaveProperty('insert', '\n');
});

test('exitList removes empty plus list item', () => {
  const doc = '+ first\n+ ';
  const result = applyEnterRules(doc, 10);

  expect(result).toBeDefined();
  expect(result?.changes).toHaveProperty('insert', '\n');
});

test('exitList does not trigger for non-empty list item', () => {
  const doc = '- item\n- content';
  const result = applyEnterRules(doc, 16);

  expect(result).toBeDefined();
  expect(result?.changes).not.toHaveProperty('insert', '\n');
});

test('newLineAfterEmptyBullet removes empty plus operator', () => {
  const doc = '+ ';
  const result = applyEnterRules(doc, 2);

  expect(result).toBeDefined();
  expect(result?.changes).toHaveProperty('from', 0);
  expect(result?.changes).toHaveProperty('to', 2);
});

test('newLineAfterEmptyBullet removes empty numbered operator', () => {
  const doc = '1. ';
  const result = applyEnterRules(doc, 3);

  expect(result).toBeDefined();
  expect(result?.changes).toHaveProperty('from', 0);
  expect(result?.changes).toHaveProperty('to', 3);
});

test('newListItem creates new item with plus operator', () => {
  const doc = '+ item';
  const result = applyEnterRules(doc, 6);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 6, to: 6, insert: '\n+ ' });
});

test('newListItem creates new item with parenthesized number', () => {
  const doc = '1) item';
  const result = applyEnterRules(doc, 7);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, to: 7, insert: '\n2) ' });
});

test('newListItem moves all text to new item when cursor right after operator', () => {
  const doc = '- hello world';
  const result = applyEnterRules(doc, 3);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 3, to: 3, insert: '\n- ' });
  expect(result?.selection).toEqual({ anchor: 6 });
});

test('newListItem splits text preserving multiple leading spaces', () => {
  const doc = '-  hello  world';
  const result = applyEnterRules(doc, 8);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 8, to: 9, insert: '\n- ' });
});

test('newListItem splits plus list at cursor', () => {
  const doc = '+ hello world';
  const result = applyEnterRules(doc, 7);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, to: 8, insert: '\n+ ' });
});

test('newListItem splits parenthesized numbered list at cursor', () => {
  const doc = '1) first second';
  const result = applyEnterRules(doc, 8);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 8, to: 9, insert: '\n2) ' });
});

test('newListItem preserves nested bullet indentation', () => {
  const doc = '- Item1\n - Nested item';
  const result = applyEnterRules(doc, 22);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 22, to: 22, insert: '\n - ' });
  expect(result?.selection).toEqual({ anchor: 26 });
});

test('newListItem preserves nested checkbox indentation', () => {
  const doc = '- Item1\n - [ ] Nested task';
  const result = applyEnterRules(doc, 26);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 26, to: 26, insert: '\n - [ ] ' });
  expect(result?.selection).toEqual({ anchor: 34 });
});

test('blockFooter adds end_quote after begin_quote', () => {
  const doc = '#+begin_quote';
  const result = applyEnterRules(doc, 13);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 13, insert: '\n\n#+end_quote' });
  expect(result?.selection).toEqual({ anchor: 14 });
});

test('blockFooter adds end_example after begin_example', () => {
  const doc = '#+begin_example';
  const result = applyEnterRules(doc, 15);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 15, insert: '\n\n#+end_example' });
});

test('blockFooter adds end_src after begin_src with language param', () => {
  const doc = '#+begin_src python';
  const result = applyEnterRules(doc, 12);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 12, insert: '\n\n#+end_src' });
});

test('exitBlockOnNewLine does not trigger inside block body without trailing newline', () => {
  const doc = '#+begin_src js\nconsole.log("test");\n#+end_src';
  const result = applyEnterRules(doc, 34);

  expect(result).toBeUndefined();
});

test('exitEmptyTableRow does not trigger for non-empty table row', () => {
  const doc = '| a |\n| b |';
  const result = applyEnterRules(doc, 11);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 11, insert: '\n|  |' });
});

test('newTableRow closes unclosed row and creates new row', () => {
  const doc = '| a | b';
  const result = applyEnterRules(doc, 7);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, insert: ' |\n|  |' });
  expect(result?.selection).toEqual({ anchor: 12 });
});

test('newTableRow places cursor inside new cell', () => {
  const doc = '| a | b |';
  const result = applyEnterRules(doc, 9);

  expect(result).toBeDefined();
  expect(result?.selection).toEqual({ anchor: 12 });
});

test('enter on plain text returns undefined', () => {
  const doc = 'just some text';
  const result = applyEnterRules(doc, 9);

  expect(result).toBeUndefined();
});

test('enter on empty document returns undefined', () => {
  const doc = '';
  const result = applyEnterRules(doc, 0);

  expect(result).toBeUndefined();
});

test('newListItem handles cursor at exact end of single-char list item', () => {
  const doc = '- a';
  const result = applyEnterRules(doc, 3);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 3, to: 3, insert: '\n- ' });
  expect(result?.selection).toEqual({ anchor: 6 });
});

test('newListItem splits minimal item at inner boundary without space', () => {
  const doc = '- ab';
  const result = applyEnterRules(doc, 3);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 3, to: 3, insert: '\n- ' });
  expect(result?.selection).toEqual({ anchor: 6 });
});

test('newListItem returns undefined when cursor is beyond list context', () => {
  const doc = '- item\nplain text';
  const result = applyEnterRules(doc, 12);

  expect(result).toBeUndefined();
});

test('exitMarkupOnEnter inserts newline after bold when cursor is before closing operator', () => {
  const doc = '*hello*';
  const result = applyEnterRules(doc, 6);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, to: 7, insert: '\n' });
  expect(result?.selection).toEqual({ anchor: 8 });
});

test('exitMarkupOnEnter inserts newline after italic when cursor is before closing operator', () => {
  const doc = '/hello/';
  const result = applyEnterRules(doc, 6);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, to: 7, insert: '\n' });
});

test('exitMarkupOnEnter does not trigger when cursor is inside markup content', () => {
  const doc = '*hello*';
  const result = applyEnterRules(doc, 3);

  expect(result).toBeUndefined();
});

test('exitMarkupOnEnter does not trigger when cursor is after closing operator', () => {
  const doc = '*hello*';
  const result = applyEnterRules(doc, 7);

  expect(result).toBeUndefined();
});

test('exitMarkupOnEnter inserts newline after outermost markup for nested markup', () => {
  const doc = '*+qwe+*';
  const result = applyEnterRules(doc, 5);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, to: 7, insert: '\n' });
  expect(result?.selection).toEqual({ anchor: 8 });
});

test('exitMarkupOnEnter exits outermost bold when cursor is before closing * in nested markup with unicode content', () => {
  const doc = '*+Руддщ йуйцуйцу+*';
  const result = applyEnterRules(doc, 17);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 18, to: 18, insert: '\n' });
  expect(result?.selection).toEqual({ anchor: 19 });
});

test('exitMarkupOnEnter exits outermost italic when cursor is before closing / in nested markup with unicode content', () => {
  const doc = '/+Руддщ йуйцуйцу+/';
  const result = applyEnterRules(doc, 17);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 18, to: 18, insert: '\n' });
  expect(result?.selection).toEqual({ anchor: 19 });
});

test('exitMarkupOnEnter exits outermost verbatim when cursor is before closing = in nested markup with unicode content', () => {
  const doc = '=+Руддщ йуйцуйцу+=';
  const result = applyEnterRules(doc, 17);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 18, to: 18, insert: '\n' });
  expect(result?.selection).toEqual({ anchor: 19 });
});

test('exitMarkupOnEnter exits outermost crossed when cursor is before closing + in nested markup with unicode content', () => {
  const doc = '+*Руддщ йуйцуйцу*+';
  const result = applyEnterRules(doc, 17);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 18, to: 18, insert: '\n' });
  expect(result?.selection).toEqual({ anchor: 19 });
});

test('exitMarkupOnEnter inserts newline after underline markup', () => {
  const doc = '_hello_';
  const result = applyEnterRules(doc, 6);

  expect(result).toBeDefined();
  expect(result?.changes).toEqual({ from: 7, to: 7, insert: '\n' });
  expect(result?.selection).toEqual({ anchor: 8 });
});
