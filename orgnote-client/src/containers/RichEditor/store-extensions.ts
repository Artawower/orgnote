import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { EditorView as EV } from '@codemirror/view';
import type { InlineEmbeddedWidgets, MultilineEmbeddedWidgets, OrgLineClasses } from 'orgnote-api';
import { getNumericCssVar } from 'src/utils/css-utils';
import {
  inlineWidgetsFacet,
  lineClassesFacet,
  multilineWidgetsFacet,
  orgNodeGetterFacet,
  readonlyFacet,
  type OrgNodeGetter,
} from './facets';
import { orgInlineWidgets, orgLineDecoration, readOnlyTransactionFilter } from './widgets';
import { createMultilineWidgetsField } from './widgets/multiline-widgets';

export const createWidgetExtensions = (editorViewRef: {
  current: EditorView | null;
}): Extension[] => [
  readOnlyTransactionFilter,
  orgInlineWidgets,
  createMultilineWidgetsField(editorViewRef),
  orgLineDecoration,
];

export const createFacetExtensions = (
  getOrgNode: OrgNodeGetter,
  readonly: boolean,
  inlineWidgets: InlineEmbeddedWidgets,
  multilineWidgets: MultilineEmbeddedWidgets,
  lineClasses: OrgLineClasses,
): Extension[] => [
  orgNodeGetterFacet.of(getOrgNode),
  readonlyFacet.of(readonly),
  inlineWidgetsFacet.of(inlineWidgets),
  multilineWidgetsFacet.of(multilineWidgets),
  lineClassesFacet.of(lineClasses),
];

const getToolbarHeight = (): number => {
  const toolbarHeight = getNumericCssVar('--editor-toolbar-height') ?? 52;
  const footerPadding = getNumericCssVar('--footer-wrapper-padding-y') ?? 0;
  const additionalOffset = 8;
  return toolbarHeight + footerPadding + additionalOffset;
};

export const createScrollMarginsExtension = (
  keyboardOpened: boolean,
  isMobile: boolean,
): Extension =>
  EV.scrollMargins.of(() => {
    if (!isMobile || !keyboardOpened) return null;
    return { bottom: getToolbarHeight() };
  });
