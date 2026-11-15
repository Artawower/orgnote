import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdownHeadingDecorations } from './markdown-heading-decorations';
import { markdownHighlighting } from './markdown-highlight-style';
import { markdownLinkDecorations } from './markdown-link-decorations';
import { markdownReadonlyDecorations } from './markdown-readonly-decorations';

const MARKDOWN_LANGUAGES = new Set(['md', 'markdown']);

export const isMarkdownLanguage = (language?: string): boolean =>
  !!language && MARKDOWN_LANGUAGES.has(language.toLowerCase());

const markdownContentClass = EditorView.contentAttributes.of({ class: 'markdown-content' });

const markdownRootClass = EditorView.editorAttributes.of({ class: 'markdown-view' });

export const getMarkdownModeExtensions = (): Extension[] => [
  markdownContentClass,
  markdownRootClass,
  markdownHeadingDecorations(),
  markdownLinkDecorations(),
  markdownHighlighting(),
];

export const getMarkdownReadonlyExtensions = (): Extension[] => [markdownReadonlyDecorations()];
