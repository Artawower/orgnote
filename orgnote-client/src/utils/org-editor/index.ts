import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import { EditorView, placeholder as cmPlaceholder } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import type { Parser } from '@lezer/common';
import { createBaseEditorExtensions } from './extensions/base';
import { createOrgLanguageExtension } from './extensions/language';
import {
  createOrgTextRenderingExtensions,
  ORG_LIST_BULLET_INLINE_CLASS,
} from './extensions/rendering';
import type { TagClickHandler, PriorityClickHandler } from './extensions/rendering';

export type { TagClickHandler, PriorityClickHandler } from './extensions/rendering';
import {
  orgEditorTheme,
  orgInlineBulletStyle,
  orgInlineModeTheme,
  orgMultilineTheme,
  orgSingleLineTheme,
} from './extensions/theme';
import { createStandaloneInlineWidgetsPlugin } from './extensions/inline-widgets';
import type { InlineEmbeddedWidgets } from 'orgnote-api';

export { orgEditorTheme, orgInlineBulletStyle, orgSelectionTheme } from './extensions/theme';
export { createBaseEditorExtensions } from './extensions/base';
export { createOrgLanguageExtension } from './extensions/language';
export { createOrgTextRenderingExtensions } from './extensions/rendering';
export { orgMode, getLastParsedOrgNode } from './parser';
export { buildOrgInlineEditorWidgets } from './widgets/org-inline-editor-widgets';
export { createStandaloneInlineWidgetsPlugin } from './extensions/inline-widgets';

export interface OrgEditorExtensionsOptions {
  mode: 'inline' | 'full';
  singleLine?: boolean;
  showSpecialSymbols?: boolean;
  onContentUpdate?: (content: string) => void;
  onAstChanged?: (node: OrgNode) => void;
  wrap?: Record<string, Parser>;
  placeholder?: string;
  readonly?: boolean;
  inlineWidgets?: InlineEmbeddedWidgets;
  onTagClick?: TagClickHandler;
  onPriorityClick?: PriorityClickHandler;
}

export const createOrgEditorExtensions = (
  opts: OrgEditorExtensionsOptions,
): { extensions: Extension[]; getOrgNode: () => OrgNode | null } => {
  let currentOrgNode: OrgNode | null = null;
  const getOrgNode = (): OrgNode | null => currentOrgNode;

  const languageExt = createOrgLanguageExtension({
    onAstChanged: (node) => {
      currentOrgNode = node;
      opts.onAstChanged?.(node);
    },
    wrap: opts.wrap,
  });

  const renderingExts = createOrgTextRenderingExtensions({
    getOrgNode,
    showSpecialSymbols: opts.showSpecialSymbols,
    singleLine: opts.singleLine,
    bulletClass: opts.mode === 'inline' ? ORG_LIST_BULLET_INLINE_CLASS : undefined,
    onTagClick: opts.onTagClick,
    onPriorityClick: opts.onPriorityClick,
  });

  const singleLineExts: Extension[] = opts.singleLine
    ? [
        orgSingleLineTheme,
        EditorState.transactionFilter.of((tr) => {
          if (!tr.docChanged) return tr;
          return tr.newDoc.toString().includes('\n') ? [] : tr;
        }),
      ]
    : [];

  const multilineExts: Extension[] = opts.singleLine
    ? []
    : [EditorView.lineWrapping, orgMultilineTheme];

  const widgetPlugin =
    !opts.singleLine && opts.inlineWidgets
      ? [
          createStandaloneInlineWidgetsPlugin({
            getOrgNode,
            getWidgets: () => opts.inlineWidgets!,
            readonly: opts.readonly ?? false,
          }),
        ]
      : [];

  const extensions: Extension[] = [
    ...singleLineExts,
    ...createBaseEditorExtensions({ onContentUpdate: opts.onContentUpdate }),
    orgEditorTheme,
    ...(opts.mode === 'inline' ? [orgInlineBulletStyle, orgInlineModeTheme] : []),
    languageExt,
    ...renderingExts,
    ...widgetPlugin,
    ...(opts.placeholder ? [cmPlaceholder(opts.placeholder)] : []),
    EditorState.readOnly.of(opts.readonly ?? false),
    ...multilineExts,
  ];

  return { extensions, getOrgNode };
};
