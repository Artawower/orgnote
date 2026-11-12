import type { EditorView } from '@codemirror/view';
import { foldEffect, unfoldEffect, foldedRanges } from '@codemirror/language';
import type { OrgNode } from 'org-mode-ast';
import { isNullable } from 'orgnote-api/utils';
import {
  parseStartupOption,
  getMaxVisibleLevel,
  collectHeadlines,
  type HeadlineInfo,
} from './startup-options';

export interface FoldRange {
  from: number;
  to: number;
}

export const isFolded = (view: EditorView, from: number, to: number): boolean => {
  const folded = foldedRanges(view.state);
  let result = false;

  folded.between(from, to, (f, t) => {
    if (f === from && t === to) {
      result = true;
    }
  });

  return result;
};

export const getFoldRangeForHeadline = (headline: HeadlineInfo): FoldRange => ({
  from: Math.max(0, headline.sectionStart - 1),
  to: headline.sectionEnd,
});

export const findHeadlineAtPos = (
  headlines: HeadlineInfo[],
  pos: number,
): HeadlineInfo | undefined =>
  headlines.find((h) => pos >= h.start && pos < h.end);

export const foldRange = (view: EditorView, from: number, to: number): void => {
  if (from >= to) return;

  const folded = foldedRanges(view.state);
  const unfoldEffects: ReturnType<typeof unfoldEffect.of>[] = [];

  folded.between(from, to, (f, t) => {
    unfoldEffects.push(unfoldEffect.of({ from: f, to: t }));
  });

  view.dispatch({
    effects: [...unfoldEffects, foldEffect.of({ from, to })],
  });
};

export const unfoldRange = (view: EditorView, from: number, to: number): void => {
  view.dispatch({
    effects: unfoldEffect.of({ from, to }),
  });
};

export const toggleFoldRange = (view: EditorView, from: number, to: number): void => {
  if (isFolded(view, from, to)) {
    unfoldRange(view, from, to);
    return;
  }
  foldRange(view, from, to);
};

export const foldHeadline = (view: EditorView, headline: HeadlineInfo): void => {
  const { from, to } = getFoldRangeForHeadline(headline);
  foldRange(view, from, to);
};

export const unfoldHeadline = (view: EditorView, headline: HeadlineInfo): void => {
  const { from, to } = getFoldRangeForHeadline(headline);
  unfoldRange(view, from, to);
};

export const toggleFoldHeadline = (view: EditorView, headline: HeadlineInfo): void => {
  const { from, to } = getFoldRangeForHeadline(headline);
  toggleFoldRange(view, from, to);
};

export const isHeadlineFolded = (view: EditorView, headline: HeadlineInfo): boolean => {
  const { from, to } = getFoldRangeForHeadline(headline);
  return isFolded(view, from, to);
};

export const foldAllHeadlines = (view: EditorView, headlines: HeadlineInfo[]): void => {
  const effects = headlines
    .filter((h) => h.sectionStart < h.sectionEnd)
    .map((h) => {
      const { from, to } = getFoldRangeForHeadline(h);
      return foldEffect.of({ from, to });
    });

  if (effects.length > 0) {
    view.dispatch({ effects });
  }
};

export const unfoldAllHeadlines = (view: EditorView): void => {
  const folded = foldedRanges(view.state);
  const effects: ReturnType<typeof unfoldEffect.of>[] = [];

  folded.between(0, view.state.doc.length, (from, to) => {
    effects.push(unfoldEffect.of({ from, to }));
  });

  if (effects.length > 0) {
    view.dispatch({ effects });
  }
};

const isHeadlineLeaf = (headline: HeadlineInfo, headlines: HeadlineInfo[]): boolean =>
  !headlines.some((other) => other.start > headline.start && other.start < headline.end);

const getLeafHeadlines = (headlines: HeadlineInfo[]): HeadlineInfo[] =>
  headlines.filter((h) => isHeadlineLeaf(h, headlines));

const getHeadlinesAtOrAboveLevel = (headlines: HeadlineInfo[], level: number): HeadlineInfo[] =>
  headlines.filter((h) => h.level >= level);

type FoldingStrategy = (view: EditorView, headlines: HeadlineInfo[], maxLevel: number) => void;

const FOLDING_STRATEGIES: Record<string, FoldingStrategy> = {
  overview: (view, headlines) => foldAllHeadlines(view, headlines),
  content: (view, headlines) => foldAllHeadlines(view, getLeafHeadlines(headlines)),
  default: (view, headlines, maxLevel) =>
    foldAllHeadlines(view, getHeadlinesAtOrAboveLevel(headlines, maxLevel)),
};

const shouldSkipFolding = (option: string | null): boolean =>
  !option || option === 'showeverything' || option === 'showall';

export const applyStartupFolding = (view: EditorView, root: OrgNode | null): void => {
  if (!root) return;

  const startupOption = parseStartupOption(root);
  if (shouldSkipFolding(startupOption)) return;

  const maxLevel = getMaxVisibleLevel(startupOption!);
  if (isNullable(maxLevel)) return;

  const headlines = collectHeadlines(root);
  const strategy = FOLDING_STRATEGIES[startupOption!] ?? FOLDING_STRATEGIES.default!;
  strategy(view, headlines, maxLevel);
};

export const toggleFoldAtCursor = (view: EditorView, headlines: HeadlineInfo[]): boolean => {
  const pos = view.state.selection.main.head;

  const headline = headlines.find((h) => pos >= h.start && pos < h.sectionStart);
  if (!headline) return false;

  toggleFoldHeadline(view, headline);
  return true;
};
