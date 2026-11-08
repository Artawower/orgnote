import { test, expect, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { codeFolding } from '@codemirror/language';
import { parse, withMetaInfo } from 'org-mode-ast';
import {
  isFolded,
  getFoldRangeForHeadline,
  findHeadlineAtPos,
  foldRange,
  unfoldRange,
  toggleFoldRange,
  foldHeadline,
  unfoldHeadline,
  toggleFoldHeadline,
  isHeadlineFolded,
  foldAllHeadlines,
  unfoldAllHeadlines,
  applyStartupFolding,
  toggleFoldAtCursor,
} from './fold-commands';
import { collectHeadlines, type HeadlineInfo } from './startup-options';

const createdViews: EditorView[] = [];

afterEach(() => {
  createdViews.splice(0).forEach((view) => view.destroy());
});

const createEditorView = (doc: string): EditorView => {
  const state = EditorState.create({
    doc,
    extensions: [codeFolding()],
  });
  const view = new EditorView({ state });
  createdViews.push(view);
  return view;
};

const createOrgTree = (doc: string) => withMetaInfo(parse(doc));

const createHeadline = (overrides: Partial<HeadlineInfo> = {}): HeadlineInfo => ({
  start: 0,
  end: 20,
  level: 1,
  sectionStart: 12,
  sectionEnd: 20,
  ...overrides,
});

test('getFoldRangeForHeadline returns fold range with from = sectionStart - 1', () => {
  const headline = createHeadline({ sectionStart: 15, sectionEnd: 30 });
  const range = getFoldRangeForHeadline(headline);
  expect(range.from).toBe(14);
});

test('getFoldRangeForHeadline returns fold range with to = sectionEnd', () => {
  const headline = createHeadline({ sectionStart: 15, sectionEnd: 30 });
  const range = getFoldRangeForHeadline(headline);
  expect(range.to).toBe(30);
});

test('findHeadlineAtPos finds headline containing position', () => {
  const headlines: HeadlineInfo[] = [
    createHeadline({ start: 0, end: 20 }),
    createHeadline({ start: 20, end: 40 }),
  ];
  const result = findHeadlineAtPos(headlines, 10);
  expect(result?.start).toBe(0);
});

test('findHeadlineAtPos finds headline at start position', () => {
  const headlines: HeadlineInfo[] = [
    createHeadline({ start: 0, end: 20 }),
    createHeadline({ start: 20, end: 40 }),
  ];
  const result = findHeadlineAtPos(headlines, 20);
  expect(result?.start).toBe(20);
});

test('findHeadlineAtPos returns undefined for position outside all headlines', () => {
  const headlines: HeadlineInfo[] = [
    createHeadline({ start: 0, end: 20 }),
  ];
  const result = findHeadlineAtPos(headlines, 100);
  expect(result).toBeUndefined();
});

test('findHeadlineAtPos returns undefined for empty headlines array', () => {
  const result = findHeadlineAtPos([], 10);
  expect(result).toBeUndefined();
});

test('isFolded returns false for unfolded range', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3');
  expect(isFolded(view, 0, 10)).toBe(false);
});

test('isFolded returns true for folded range', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3');
  foldRange(view, 7, 14);
  expect(isFolded(view, 7, 14)).toBe(true);
});

test('isFolded returns false for different range when another is folded', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3\nLine 4');
  foldRange(view, 7, 14);
  expect(isFolded(view, 15, 21)).toBe(false);
});

test('foldRange folds specified range', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3');
  foldRange(view, 7, 14);
  expect(isFolded(view, 7, 14)).toBe(true);
});

test('foldRange does nothing when from >= to', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3');
  foldRange(view, 14, 7);
  expect(isFolded(view, 7, 14)).toBe(false);
});

test('foldRange does nothing when from === to', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3');
  foldRange(view, 10, 10);
  expect(isFolded(view, 10, 10)).toBe(false);
});

test('foldRange unfolds nested ranges before folding parent', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
  foldRange(view, 14, 21);
  foldRange(view, 7, 28);
  expect(isFolded(view, 7, 28)).toBe(true);
  expect(isFolded(view, 14, 21)).toBe(false);
});

test('unfoldRange unfolds folded range', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3');
  foldRange(view, 7, 14);
  unfoldRange(view, 7, 14);
  expect(isFolded(view, 7, 14)).toBe(false);
});

test('toggleFoldRange folds unfolded range', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3');
  toggleFoldRange(view, 7, 14);
  expect(isFolded(view, 7, 14)).toBe(true);
});

test('toggleFoldRange unfolds folded range', () => {
  const view = createEditorView('Line 1\nLine 2\nLine 3');
  foldRange(view, 7, 14);
  toggleFoldRange(view, 7, 14);
  expect(isFolded(view, 7, 14)).toBe(false);
});

test('foldHeadline folds headline section', () => {
  const doc = '* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  foldHeadline(view, headlines[0]!);
  expect(isHeadlineFolded(view, headlines[0]!)).toBe(true);
});

test('unfoldHeadline unfolds headline section', () => {
  const doc = '* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  foldHeadline(view, headlines[0]!);
  unfoldHeadline(view, headlines[0]!);
  expect(isHeadlineFolded(view, headlines[0]!)).toBe(false);
});

test('toggleFoldHeadline folds unfolded headline', () => {
  const doc = '* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  toggleFoldHeadline(view, headlines[0]!);
  expect(isHeadlineFolded(view, headlines[0]!)).toBe(true);
});

test('toggleFoldHeadline unfolds folded headline', () => {
  const doc = '* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  foldHeadline(view, headlines[0]!);
  toggleFoldHeadline(view, headlines[0]!);
  expect(isHeadlineFolded(view, headlines[0]!)).toBe(false);
});

test('isHeadlineFolded returns false for unfolded headline', () => {
  const doc = '* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  expect(isHeadlineFolded(view, headlines[0]!)).toBe(false);
});

test('isHeadlineFolded returns true for folded headline', () => {
  const doc = '* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  foldHeadline(view, headlines[0]!);
  expect(isHeadlineFolded(view, headlines[0]!)).toBe(true);
});

test('foldAllHeadlines folds all provided headlines', () => {
  const doc = '* Headline 1\nContent 1\n* Headline 2\nContent 2';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  foldAllHeadlines(view, headlines);

  headlines.forEach((h) => {
    expect(isHeadlineFolded(view, h)).toBe(true);
  });
});

test('foldAllHeadlines does nothing for empty headlines array', () => {
  const view = createEditorView('Some text');
  foldAllHeadlines(view, []);
});

test('unfoldAllHeadlines unfolds all folded ranges', () => {
  const doc = '* Headline 1\nContent 1\n* Headline 2\nContent 2';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  foldAllHeadlines(view, headlines);
  unfoldAllHeadlines(view);

  headlines.forEach((h) => {
    expect(isHeadlineFolded(view, h)).toBe(false);
  });
});

test('applyStartupFolding does nothing for null root', () => {
  const view = createEditorView('* Headline\nContent');
  applyStartupFolding(view, null);
});

test('applyStartupFolding does nothing without STARTUP option', () => {
  const doc = '* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);

  applyStartupFolding(view, root);

  const headlines = collectHeadlines(root);
  expect(isHeadlineFolded(view, headlines[0]!)).toBe(false);
});

test('applyStartupFolding does nothing for showeverything option', () => {
  const doc = '#+STARTUP: showeverything\n* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);

  applyStartupFolding(view, root);

  const headlines = collectHeadlines(root);
  expect(isHeadlineFolded(view, headlines[0]!)).toBe(false);
});

test('applyStartupFolding does nothing for showall option', () => {
  const doc = '#+STARTUP: showall\n* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);

  applyStartupFolding(view, root);

  const headlines = collectHeadlines(root);
  expect(isHeadlineFolded(view, headlines[0]!)).toBe(false);
});

test('applyStartupFolding folds all headlines for overview option', () => {
  const doc = '#+STARTUP: overview\n* Headline 1\nContent 1\n* Headline 2\nContent 2';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);

  applyStartupFolding(view, root);

  const headlines = collectHeadlines(root);
  headlines.forEach((h) => {
    expect(isHeadlineFolded(view, h)).toBe(true);
  });
});

test('applyStartupFolding folds leaf headlines for content option', () => {
  const doc = '#+STARTUP: content\n* Parent\n** Child\nChild content';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);

  applyStartupFolding(view, root);

  const headlines = collectHeadlines(root);
  const parent = headlines.find((h) => h.level === 1);
  const child = headlines.find((h) => h.level === 2);

  expect(isHeadlineFolded(view, parent!)).toBe(false);
  expect(isHeadlineFolded(view, child!)).toBe(true);
});

test('applyStartupFolding folds headlines at or above specified level for show2levels', () => {
  const doc = '#+STARTUP: show2levels\n* Level 1\n** Level 2\nContent\n*** Level 3\nMore content';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);

  applyStartupFolding(view, root);

  const headlines = collectHeadlines(root);
  const level1 = headlines.find((h) => h.level === 1);
  const level2 = headlines.find((h) => h.level === 2);
  const level3 = headlines.find((h) => h.level === 3);

  expect(isHeadlineFolded(view, level1!)).toBe(false);
  expect(isHeadlineFolded(view, level2!)).toBe(true);
  if (level3) {
    expect(isHeadlineFolded(view, level3)).toBe(true);
  }
});

test('toggleFoldAtCursor returns false when cursor not on headline', () => {
  const doc = '* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  view.dispatch({ selection: { anchor: 15 } });

  const result = toggleFoldAtCursor(view, headlines);
  expect(result).toBe(false);
});

test('toggleFoldAtCursor returns false for empty headlines', () => {
  const view = createEditorView('Some text');
  const result = toggleFoldAtCursor(view, []);
  expect(result).toBe(false);
});

test('toggleFoldAtCursor toggles fold when cursor on headline title', () => {
  const doc = '* Headline\nContent here';
  const view = createEditorView(doc);
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  view.dispatch({ selection: { anchor: 5 } });

  const result = toggleFoldAtCursor(view, headlines);
  expect(result).toBe(true);
  expect(isHeadlineFolded(view, headlines[0]!)).toBe(true);
});
