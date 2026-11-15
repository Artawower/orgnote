import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const CLASS = {
  headingToken: 'markdown-heading-token',
  strong: 'markdown-strong',
  emphasis: 'markdown-emphasis',
  linkToken: 'markdown-link-token',
  url: 'markdown-url',
  code: 'markdown-code',
  marker: 'markdown-marker',
  strikethrough: 'markdown-strikethrough',
  label: 'markdown-label',
} as const;

const markdownHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, class: CLASS.headingToken },
  { tag: t.heading2, class: CLASS.headingToken },
  { tag: t.heading3, class: CLASS.headingToken },
  { tag: t.heading4, class: CLASS.headingToken },
  { tag: t.heading5, class: CLASS.headingToken },
  { tag: t.heading6, class: CLASS.headingToken },
  { tag: t.strong, class: CLASS.strong },
  { tag: t.emphasis, class: CLASS.emphasis },
  { tag: t.link, class: CLASS.linkToken },
  { tag: t.url, class: CLASS.url },
  { tag: t.monospace, class: CLASS.code },
  { tag: t.processingInstruction, class: CLASS.marker },
  { tag: t.strikethrough, class: CLASS.strikethrough },
  { tag: t.labelName, class: CLASS.label },
]);

export const markdownHighlighting = () => syntaxHighlighting(markdownHighlightStyle);
