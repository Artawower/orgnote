import type { EditorView } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import { insertTemplate, replaceRange, deleteRange, getCurrentLine } from './editor-primitives';
import {
  findNodeAtLine,
  getNodePrefixRange,
  isHeadline,
  isBulletListItem,
  isNumericListItem,
  isCheckboxListItem,
  isToggleableNode,
} from './org-ast';
import { formatOrgDate } from './org-date';

type NodeMatcher = (node: OrgNode) => boolean;

const BLOCK_PREFIX = '#+BEGIN_';
const BLOCK_SUFFIX = '\n\n#+END_';
const NEWLINE_LENGTH = 1;

const calcBlockContentOffset = (blockType: string): number =>
  BLOCK_PREFIX.length + blockType.length + NEWLINE_LENGTH;

const LATEX_EXPORT_TEMPLATE = '#+BEGIN_EXPORT latex\n\n#+END_EXPORT';
const LATEX_CONTENT_OFFSET = '#+BEGIN_EXPORT latex\n'.length;

const LINK_OPEN = '[[';
const LINK_SEPARATOR = '][';
const LINK_CLOSE = ']]';

const calcLinkFocusOffset = (url: string): number =>
  url ? LINK_OPEN.length + url.length + LINK_SEPARATOR.length : LINK_OPEN.length;

const buildLinkTemplate = (url: string): string =>
  `${LINK_OPEN}${url}${LINK_SEPARATOR}${LINK_CLOSE}`;

const IMAGE_LINK_PREFIX = '[[./';
const IMAGE_LINK_SUFFIX = ']]';

const wrapInline = (view: EditorView, char: string): void => {
  insertTemplate(view, {
    template: `${char}${char}`,
    focusOffset: char.length,
    wrapSelection: 'inline',
  });
};

const insertBlock = (view: EditorView, blockType: string): void => {
  const template = `${BLOCK_PREFIX}${blockType}${BLOCK_SUFFIX}${blockType}`;
  const contentOffset = calcBlockContentOffset(blockType);
  insertTemplate(view, {
    template,
    focusOffset: contentOffset,
    overrideLine: true,
    wrapSelection: 'block',
    selectionInsertOffset: contentOffset,
  });
};

interface ToggleContext {
  view: EditorView;
  node: OrgNode | undefined;
  template: string;
  lineEnd: number;
}

const moveCursorToLineEnd = (view: EditorView, position: number): void => {
  view.dispatch({ selection: { anchor: position, head: position } });
};

const tryRemovePrefix = (ctx: ToggleContext, matcher: NodeMatcher): boolean => {
  if (!ctx.node || !matcher(ctx.node)) return false;

  const { from, to } = getNodePrefixRange(ctx.node);
  const newLineEnd = ctx.lineEnd - (to - from);
  deleteRange(ctx.view, from, to);
  moveCursorToLineEnd(ctx.view, newLineEnd);
  return true;
};

const tryReplacePrefix = (ctx: ToggleContext): boolean => {
  if (!ctx.node || !isToggleableNode(ctx.node)) return false;

  const { from, to } = getNodePrefixRange(ctx.node);
  const newLineEnd = ctx.lineEnd - (to - from) + ctx.template.length;
  replaceRange(ctx.view, from, to, ctx.template);
  moveCursorToLineEnd(ctx.view, newLineEnd);
  return true;
};

const insertPrefix = (ctx: ToggleContext): boolean => {
  insertTemplate(ctx.view, { template: ctx.template, prependToLine: true });
  return true;
};

const toggleLinePrefix = (
  view: EditorView,
  orgNode: OrgNode | undefined,
  template: string,
  matcher: NodeMatcher,
): void => {
  const { from: lineStart, to: lineEnd } = getCurrentLine(view);
  const node = findNodeAtLine(orgNode, lineStart);
  const ctx: ToggleContext = { view, node, template, lineEnd };

  if (tryRemovePrefix(ctx, matcher) || tryReplacePrefix(ctx)) {
    return;
  }

  insertPrefix(ctx);
};

export const createOrgEditing = (view: EditorView, orgNode?: OrgNode) => ({
  bold: () => wrapInline(view, '*'),

  italic: () => wrapInline(view, '/'),

  strikethrough: () => wrapInline(view, '+'),

  code: () => wrapInline(view, '~'),

  underline: () => wrapInline(view, '_'),

  insertHeadline: () => insertTemplate(view, { template: '* ', prependToLine: true }),

  toggleHeadline: () => toggleLinePrefix(view, orgNode, '* ', isHeadline),

  insertBulletList: () => insertTemplate(view, { template: '- ', prependToLine: true }),

  toggleBulletList: () => toggleLinePrefix(view, orgNode, '- ', isBulletListItem),

  insertNumericList: () => insertTemplate(view, { template: '1. ', prependToLine: true }),

  toggleNumericList: () => toggleLinePrefix(view, orgNode, '1. ', isNumericListItem),

  insertCheckboxList: () => insertTemplate(view, { template: '- [ ] ', prependToLine: true }),

  toggleCheckboxList: () => toggleLinePrefix(view, orgNode, '- [ ] ', isCheckboxListItem),

  insertCodeBlock: (language = '') => {
    const srcPrefix = '#+BEGIN_SRC ';
    const template = `${srcPrefix}${language}\n\n#+END_SRC`;
    const contentOffset = srcPrefix.length + language.length + NEWLINE_LENGTH;
    insertTemplate(view, {
      template,
      focusOffset: contentOffset,
      overrideLine: true,
      wrapSelection: 'block',
      selectionInsertOffset: contentOffset + NEWLINE_LENGTH,
    });
  },

  insertQuote: () => insertBlock(view, 'QUOTE'),

  insertLatex: () => {
    insertTemplate(view, {
      template: LATEX_EXPORT_TEMPLATE,
      focusOffset: LATEX_CONTENT_OFFSET,
      overrideLine: true,
      wrapSelection: 'block',
      selectionInsertOffset: LATEX_CONTENT_OFFSET,
    });
  },

  insertHtmlBlock: () => insertBlock(view, 'HTML'),

  insertHorizontalRule: () => insertTemplate(view, { template: '-----\n' }),

  insertLink: (url = '') => {
    const template = buildLinkTemplate(url);
    const focusOffset = calcLinkFocusOffset(url);
    insertTemplate(view, { template, focusOffset });
  },

  insertInternalLink: (id: string, title: string) => {
    const template = `${LINK_OPEN}id:${id}${LINK_SEPARATOR}${title}${LINK_CLOSE}`;
    insertTemplate(view, { template, focusOffset: template.length });
  },

  insertImage: (filename: string) => {
    const template = `${IMAGE_LINK_PREFIX}${filename}${IMAGE_LINK_SUFFIX}`;
    insertTemplate(view, { template, focusOffset: IMAGE_LINK_PREFIX.length, overrideLine: true });
  },

  insertTable: () => insertTemplate(view, { template: '\n| ' }),

  insertDatetime: () =>
    insertTemplate(view, { template: formatOrgDate(new Date(), { trailingSpace: true }) }),
});
