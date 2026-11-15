import { Facet } from '@codemirror/state';
import type { OrgNode } from 'org-mode-ast';
import type {
  InlineEmbeddedWidgets,
  MultilineEmbeddedWidgets,
  OrgLineClasses,
  InlineEmbeddedWidget,
  MultilineEmbeddedWidget,
  OrgLineClass,
} from 'orgnote-api';

export type OrgNodeGetter = () => OrgNode | null;

type Widget = InlineEmbeddedWidget | MultilineEmbeddedWidget | OrgLineClass;

const mergeEntries = <T extends Widget>(
  result: Record<string, T[]>,
  [nodeType, widgets]: [string, T[] | undefined],
): Record<string, T[]> => {
  if (!widgets) return result;
  result[nodeType] = [...(result[nodeType] ?? []), ...widgets];
  return result;
};

const mergeWidgetArrays = <T extends Widget>(
  inputs: readonly Record<string, T[] | undefined>[],
): Record<string, T[] | undefined> => {
  return inputs
    .flatMap((input) => Object.entries(input))
    .reduce(mergeEntries, {} as Record<string, T[]>);
};

export const orgNodeGetterFacet = Facet.define<OrgNodeGetter, OrgNodeGetter>({
  combine: (inputs) => inputs[0] ?? (() => null),
});

export const readonlyFacet = Facet.define<boolean, boolean>({
  combine: (inputs) => inputs[0] ?? false,
});

export const inlineWidgetsFacet = Facet.define<InlineEmbeddedWidgets, InlineEmbeddedWidgets>({
  combine: (inputs) => mergeWidgetArrays(inputs),
});

export const multilineWidgetsFacet = Facet.define<
  MultilineEmbeddedWidgets,
  MultilineEmbeddedWidgets
>({
  combine: (inputs) => mergeWidgetArrays(inputs),
});

export const lineClassesFacet = Facet.define<OrgLineClasses, OrgLineClasses>({
  combine: (inputs) => mergeWidgetArrays(inputs),
});
