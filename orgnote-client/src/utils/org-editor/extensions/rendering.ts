import { Decoration, EditorView, WidgetType, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { Extension, Range } from '@codemirror/state';
import { NodeType, walkTree, parse, withMetaInfo } from 'org-mode-ast';
import type { OrgNode } from 'org-mode-ast';
import { isPresent } from 'orgnote-api';

const MARKUP_PARENT_TYPES = [
  NodeType.Bold,
  NodeType.Italic,
  NodeType.Verbatim,
  NodeType.InlineCode,
  NodeType.Crossed,
  NodeType.Underline,
] as const;

const invisibleReplace = Decoration.replace({});
const tagMark = Decoration.mark({ class: 'org-file-tag' });
const linkMark = Decoration.mark({ class: 'org-link' });

class BulletWidget extends WidgetType {
  constructor(
    private readonly char: string,
    private readonly className: string,
  ) {
    super();
  }

  override toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = this.className;
    span.textContent = this.char;
    return span;
  }

  override eq(other: WidgetType): boolean {
    const o = other as BulletWidget;
    return o.char === this.char && o.className === this.className;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

const isMarkupOperator = (node: OrgNode): boolean =>
  node.is(NodeType.Operator) && MARKUP_PARENT_TYPES.some((t) => node.parent?.is(t));

const isInHeadlineTitle = (node: OrgNode): boolean =>
  (node.parent?.is(NodeType.Title) ?? false) &&
  (node.parent?.parent?.is(NodeType.Headline) ?? false);

const isHeadlineOperator = (node: OrgNode): boolean =>
  node.is(NodeType.Operator) && isInHeadlineTitle(node);

const isListItemOperator = (node: OrgNode): boolean =>
  node.is(NodeType.Operator) &&
  !!(
    node.parent?.parent?.is(NodeType.ListItem) &&
    !node.parent.parent.parent?.ordered &&
    node.parent.isNot(NodeType.Section)
  );

const isOnActiveLine = (view: EditorView, node: OrgNode, caret: number): boolean => {
  const clampedStart = Math.min(node.start, view.state.doc.length - 1);
  const activeLine = view.state.doc.lineAt(caret);
  const nodeLine = view.state.doc.lineAt(Math.max(0, clampedStart));
  return activeLine.number === nodeLine.number;
};

const isCaretInParentRange = (caret: number, node: OrgNode): boolean => {
  const parent = node.parent;
  return !!(parent && caret >= parent.start && caret <= parent.end);
};

const buildMarkupHideDecorations = (
  view: EditorView,
  getOrgNode: () => OrgNode | null,
  singleLine: boolean,
): DecorationSet => {
  const orgNode = getOrgNode();
  if (!orgNode) return Decoration.none;

  const ranges: Range<Decoration>[] = [];
  const caret = view.state.selection.main.head;

  walkTree(orgNode, (node: OrgNode): boolean => {
    if (!isMarkupOperator(node)) return false;
    if (!singleLine && view.hasFocus && isOnActiveLine(view, node, caret)) return false;
    if (view.hasFocus && isCaretInParentRange(caret, node)) return false;

    ranges.push(invisibleReplace.range(node.start, node.end));
    return false;
  });

  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges);
};

const buildHeadlineOperatorDecorations = (
  view: EditorView,
  getOrgNode: () => OrgNode | null,
): DecorationSet => {
  const orgNode = getOrgNode();
  if (!orgNode) return Decoration.none;

  const ranges: Range<Decoration>[] = [];
  const caret = view.state.selection.main.head;

  walkTree(orgNode, (node: OrgNode): boolean => {
    if (!isHeadlineOperator(node)) return false;
    if (view.hasFocus && isOnActiveLine(view, node, caret)) return false;

    ranges.push(invisibleReplace.range(node.start, node.end));
    return false;
  });

  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges);
};

const buildListBulletDecorations = (
  getOrgNode: () => OrgNode | null,
  bulletClass: string,
): DecorationSet => {
  const orgNode = getOrgNode();
  if (!orgNode) return Decoration.none;

  const ranges: Range<Decoration>[] = [];

  walkTree(orgNode, (node: OrgNode): boolean => {
    if (!isListItemOperator(node)) return false;

    const operator = node.value?.trim();
    const char = operator === '-' ? '•' : '◦';
    ranges.push(
      Decoration.replace({ widget: new BulletWidget(char, bulletClass) }).range(
        node.start,
        node.end,
      ),
    );
    return false;
  });

  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges);
};

const HEADLINE_PREFIX = '* ';

export type ReplaceTextFn = (newText: string) => void;
export type TagClickHandler = (tag: string, replaceWith: ReplaceTextFn) => void;

const findTagAtPos = (
  doc: string,
  pos: number,
): { tag: string; from: number; to: number } | null => {
  const ast = withMetaInfo(parse(`${HEADLINE_PREFIX}${doc}`));
  let found: { tag: string; from: number; to: number } | null = null;
  walkTree(ast, (node: OrgNode): boolean => {
    if (!node.is(NodeType.Text) || !node.parent?.is(NodeType.TagList)) return false;
    const from = node.start - HEADLINE_PREFIX.length;
    const to = node.end - HEADLINE_PREFIX.length;
    if (pos >= from && pos < to) found = { tag: node.value ?? '', from, to };
    return false;
  });
  return found;
};

export type PriorityClickHandler = () => void;

const makePriorityClickPlugin = (onPriorityClick: PriorityClickHandler): Extension =>
  EditorView.domEventHandlers({
    mousedown: (event: MouseEvent): boolean => {
      const target = event.target as HTMLElement;
      const el = target.closest('[class*="org-priority-"]') as HTMLElement | null;
      if (!el) return false;
      event.preventDefault();
      onPriorityClick();
      return true;
    },
  });

const makeTagClickPlugin = (onTagClick: TagClickHandler): Extension =>
  EditorView.domEventHandlers({
    mousedown: (event: MouseEvent, view: EditorView): boolean => {
      const target = event.target as HTMLElement;
      if (!target.closest('.org-file-tag')) return false;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (!pos) return false;
      const tagInfo = findTagAtPos(view.state.doc.toString(), pos);
      if (!tagInfo) return false;
      event.preventDefault();
      const replaceWith: ReplaceTextFn = (newText) =>
        view.dispatch({ changes: { from: tagInfo.from, to: tagInfo.to, insert: newText } });
      onTagClick(tagInfo.tag, replaceWith);
      return true;
    },
  });

const buildPriorityDecorations = (view: EditorView): DecorationSet => {
  const doc = view.state.doc.toString();
  const ast = withMetaInfo(parse(`${HEADLINE_PREFIX}${doc}`));
  const ranges: Range<Decoration>[] = [];

  walkTree(ast, (node: OrgNode): boolean => {
    if (!node.is(NodeType.Priority)) return false;
    const textNode = node.childrenList?.find((c) => c.is(NodeType.Text));
    const letter = textNode?.value?.slice(1)?.toLowerCase();
    if (!letter) return false;
    const start = node.start - HEADLINE_PREFIX.length;
    const end = node.end - HEADLINE_PREFIX.length;
    if (start >= 0 && start < end)
      ranges.push(Decoration.mark({ class: `org-priority-${letter}` }).range(start, end));
    return false;
  });

  return ranges.length ? Decoration.set(ranges) : Decoration.none;
};

const makePriorityPlugin = () =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(view: EditorView) {
        this.decorations = buildPriorityDecorations(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildPriorityDecorations(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );

const buildTagMarkDecorations = (view: EditorView): DecorationSet => {
  const doc = view.state.doc.toString();
  const ast = withMetaInfo(parse(`${HEADLINE_PREFIX}${doc}`));
  const ranges: Range<Decoration>[] = [];

  walkTree(ast, (node: OrgNode): boolean => {
    if (!node.is(NodeType.Text) || !node.parent?.is(NodeType.TagList)) return false;
    const start = (node.parent?.start ?? node.start) - HEADLINE_PREFIX.length;
    const end = (node.parent?.end ?? node.end) - HEADLINE_PREFIX.length;
    if (start >= 0 && start < end) ranges.push(tagMark.range(start, end));
    return false;
  });

  return ranges.length ? Decoration.set(ranges) : Decoration.none;
};

const buildLinkDecorations = (
  view: EditorView,
  getOrgNode: () => OrgNode | null,
): DecorationSet => {
  const orgNode = getOrgNode();
  if (!orgNode) return Decoration.none;

  const caret = view.state.selection.main.head;
  const ranges: Range<Decoration>[] = [];

  walkTree(orgNode, (node: OrgNode): boolean => {
    if (!node.is(NodeType.Link)) return false;

    if (view.hasFocus && caret >= node.start && caret <= node.end) return false;

    const displayNode =
      node.childrenList?.find((c) => c.is(NodeType.LinkName)) ??
      node.childrenList?.find((c) => c.is(NodeType.LinkUrl)) ??
      null;

    if (!displayNode) return false;

    const LINK_BRACKET_LENGTH = 1;
    const textStart = displayNode.start + LINK_BRACKET_LENGTH;
    const textEnd = displayNode.end - LINK_BRACKET_LENGTH;

    if (textStart >= textEnd) return false;

    if (node.start < textStart) {
      ranges.push(invisibleReplace.range(node.start, textStart));
    }
    ranges.push(linkMark.range(textStart, textEnd));
    if (textEnd < node.end) {
      ranges.push(invisibleReplace.range(textEnd, node.end));
    }

    return false;
  });

  ranges.sort((a, b) => a.from - b.from);
  return ranges.length ? Decoration.set(ranges, true) : Decoration.none;
};

const needsRebuildForOrgNode = (
  decorations: DecorationSet,
  getOrgNode: () => OrgNode | null,
): boolean => decorations === Decoration.none && isPresent(getOrgNode());

const makeMarkupPlugin = (getOrgNode: () => OrgNode | null, singleLine: boolean) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(view: EditorView) {
        this.decorations = buildMarkupHideDecorations(view, getOrgNode, singleLine);
      }

      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.focusChanged ||
          update.selectionSet ||
          needsRebuildForOrgNode(this.decorations, getOrgNode)
        ) {
          this.decorations = buildMarkupHideDecorations(update.view, getOrgNode, singleLine);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );

const makeHeadlinePlugin = (getOrgNode: () => OrgNode | null) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(view: EditorView) {
        this.decorations = buildHeadlineOperatorDecorations(view, getOrgNode);
      }

      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.focusChanged ||
          update.selectionSet ||
          needsRebuildForOrgNode(this.decorations, getOrgNode)
        ) {
          this.decorations = buildHeadlineOperatorDecorations(update.view, getOrgNode);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );

const makeListPlugin = (getOrgNode: () => OrgNode | null, bulletClass: string) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor() {
        this.decorations = buildListBulletDecorations(getOrgNode, bulletClass);
      }

      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          needsRebuildForOrgNode(this.decorations, getOrgNode)
        ) {
          this.decorations = buildListBulletDecorations(getOrgNode, bulletClass);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );

const makeTagPlugin = () =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(view: EditorView) {
        this.decorations = buildTagMarkDecorations(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildTagMarkDecorations(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );

const makeLinkPlugin = (getOrgNode: () => OrgNode | null) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(view: EditorView) {
        this.decorations = buildLinkDecorations(view, getOrgNode);
      }

      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.focusChanged ||
          update.selectionSet ||
          needsRebuildForOrgNode(this.decorations, getOrgNode)
        ) {
          this.decorations = buildLinkDecorations(update.view, getOrgNode);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );

export const ORG_LIST_BULLET_CLASS = 'org-list-bullet';
export const ORG_LIST_BULLET_INLINE_CLASS = 'org-list-bullet-inline';

export interface OrgTextRenderingOptions {
  getOrgNode: () => OrgNode | null;
  showSpecialSymbols?: boolean;
  singleLine?: boolean;
  bulletClass?: string;
  onTagClick?: TagClickHandler;
  onPriorityClick?: PriorityClickHandler;
}

export const createOrgTextRenderingExtensions = (opts: OrgTextRenderingOptions): Extension[] => {
  if (opts.showSpecialSymbols) return [];

  const bulletClass = opts.bulletClass ?? ORG_LIST_BULLET_CLASS;

  return [
    makeMarkupPlugin(opts.getOrgNode, opts.singleLine ?? false),
    makeHeadlinePlugin(opts.getOrgNode),
    makeListPlugin(opts.getOrgNode, bulletClass),
    makeTagPlugin(),
    makePriorityPlugin(),
    makeLinkPlugin(opts.getOrgNode),
    ...(opts.onTagClick ? [makeTagClickPlugin(opts.onTagClick)] : []),
    ...(opts.onPriorityClick ? [makePriorityClickPlugin(opts.onPriorityClick)] : []),
  ];
};
