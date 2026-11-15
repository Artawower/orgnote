import type { EditorView } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { Decoration, ViewPlugin } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import { NodeType, findParent, walkTree } from 'org-mode-ast';
import type { LineAttributes, OrgLineClasses, OrgLineClass } from 'orgnote-api';
import { resolveValue } from 'src/utils/resolve-value';
import { orgNodeGetterFacet, lineClassesFacet } from '../facets';

type LineDecorationRange = Range<Decoration>;

interface ResolvedLineDecoration {
  className?: string;
  attributes?: LineAttributes;
}

const normalizeStyle = (value: string): string => value.trimEnd().replace(/;$/, '');

const mergeStyles = (current: string | undefined, next: string): string => {
  const normalizedNext = normalizeStyle(next);
  if (!current) return normalizedNext;

  return `${normalizeStyle(current)}; ${normalizedNext}`;
};

const mergeAttributes = (
  current: LineAttributes | undefined,
  next: LineAttributes | undefined,
): LineAttributes | undefined => {
  if (!next) return current;

  return Object.entries(next).reduce<LineAttributes>(
    (result, [key, value]) => {
      if (key === 'style') {
        return { ...result, style: mergeStyles(result.style, value) };
      }

      return { ...result, [key]: value };
    },
    { ...(current ?? {}) },
  );
};

const resolveLineAttributes = (widget: OrgLineClass, node: OrgNode): LineAttributes | undefined =>
  resolveValue(widget.attributes, node);

const resolveLineClass = (widget: OrgLineClass, node: OrgNode): string | undefined =>
  resolveValue(widget.class, node);

const resolveNodeLineDecoration = (
  widgets: OrgLineClass[] | undefined,
  node: OrgNode,
): ResolvedLineDecoration | undefined => {
  if (!widgets?.length) return undefined;

  const classNames = widgets.map((widget) => resolveLineClass(widget, node)).filter(Boolean);
  const attributes = widgets.reduce<LineAttributes | undefined>(
    (result, widget) => mergeAttributes(result, resolveLineAttributes(widget, node)),
    undefined,
  );

  if (classNames.length === 0 && !attributes) return undefined;

  return {
    className: classNames.length > 0 ? classNames.join(' ') : undefined,
    attributes,
  };
};

const createLineDecorationRange = (
  decoration: ResolvedLineDecoration,
  from: number,
): LineDecorationRange =>
  Decoration.line({
    class: decoration.className,
    attributes: decoration.attributes,
  }).range(from, from);

const buildDefaultLineDecorationRanges = (
  node: OrgNode,
  decoration: ResolvedLineDecoration,
): LineDecorationRange[] => [createLineDecorationRange(decoration, node.start)];

const buildSrcParentLineDecorationRanges = (
  node: OrgNode,
  decoration: ResolvedLineDecoration,
): LineDecorationRange[] => {
  const srcParent = findParent(node, (candidate) => candidate.is(NodeType.SrcBlock));
  if (!srcParent) return [];

  const lineValues = node.value?.split('\n');
  if (!lineValues?.length) return [];

  let position = node.start;
  return lineValues.map((lineValue) => {
    const range = createLineDecorationRange(decoration, position);
    position += lineValue.length + 1;
    return range;
  });
};

const buildNodeLineDecorationRanges = (
  node: OrgNode,
  widgets: OrgLineClass[] | undefined,
): LineDecorationRange[] => {
  const decoration = resolveNodeLineDecoration(widgets, node);
  if (!decoration) return [];

  return [
    ...buildSrcParentLineDecorationRanges(node, decoration),
    ...buildDefaultLineDecorationRanges(node, decoration),
  ];
};

const buildLineDecorations = (
  orgNode: OrgNode | null,
  orgLineClasses: OrgLineClasses,
): DecorationSet => {
  if (!orgNode) return Decoration.none;

  const lineDecorationRanges: LineDecorationRange[] = [];

  walkTree(orgNode, (node: OrgNode): boolean => {
    lineDecorationRanges.push(...buildNodeLineDecorationRanges(node, orgLineClasses[node.type]));
    return false;
  });

  lineDecorationRanges.sort((previous, current) => previous.from - current.from);
  return Decoration.set(lineDecorationRanges);
};

export const orgLineDecoration = ViewPlugin.fromClass(
  class {
    public decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    private buildDecorations(view: EditorView): DecorationSet {
      const getOrgNode = view.state.facet(orgNodeGetterFacet);
      const lineClasses = view.state.facet(lineClassesFacet);
      return buildLineDecorations(getOrgNode(), lineClasses);
    }

    public update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (value) => value.decorations,
  },
);