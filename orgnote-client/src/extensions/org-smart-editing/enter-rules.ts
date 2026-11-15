import type { TransactionSpec } from '@codemirror/state';
import { NodeType, findParent, walkThroughParents, type OrgNode } from 'org-mode-ast';

const markupNodeTypes = [
  NodeType.Bold,
  NodeType.Italic,
  NodeType.Verbatim,
  NodeType.InlineCode,
  NodeType.Crossed,
  NodeType.Underline,
] as const;

const isMarkupType = (node: OrgNode): boolean => markupNodeTypes.some((t) => node.is(t));

const isMarkupOperator = (node: OrgNode): boolean =>
  node.is(NodeType.Operator) && !!node.parent && isMarkupType(node.parent);

const isLastChildClosingOperator = (op: OrgNode): boolean =>
  op.is(NodeType.Operator) && op.parent?.children?.last === op;

const resolveOutermostMarkupEnd = (closingOp: OrgNode): number => {
  if (!closingOp.parent) return closingOp.end;
  let outermost = closingOp.parent;

  walkThroughParents(outermost, (parent) => {
    if (!isMarkupType(parent)) return true;

    const parentLastChild = parent.children?.last;
    const isAdjacentClosingOperator =
      parentLastChild?.is(NodeType.Operator) && parentLastChild.start === outermost.end;

    if (!isAdjacentClosingOperator) return true;

    outermost = parent;
    return false;
  });

  return outermost.end;
};

const findOuterClosingOperatorAtPos = (node: OrgNode, cursorPos: number): OrgNode | undefined => {
  let current: OrgNode | undefined = node;

  while (current) {
    const next = current.next;
    if (next && isMarkupOperator(next) && cursorPos === next.start) {
      return next;
    }
    current = current.parent;
  }

  return undefined;
};

const findClosingMarkupOperator = (node: OrgNode, cursorPos: number): OrgNode | undefined => {
  if (!node.parent) return undefined;

  if (isMarkupOperator(node) && cursorPos === node.start) {
    return node;
  }

  const nextSibling = node.next;
  if (nextSibling && isMarkupOperator(nextSibling) && cursorPos === nextSibling.start) {
    return nextSibling;
  }

  if (isMarkupOperator(node) && cursorPos === node.end) {
    return findOuterClosingOperatorAtPos(node.parent, cursorPos);
  }

  return undefined;
};

const exitMarkupOnEnter = (node: OrgNode, cursorPos: number): TransactionSpec | undefined => {
  const closingOp = findClosingMarkupOperator(node, cursorPos);
  if (!closingOp || !isLastChildClosingOperator(closingOp)) return;

  const markupEnd = resolveOutermostMarkupEnd(closingOp);

  return {
    changes: { from: markupEnd, to: markupEnd, insert: '\n' },
    selection: { anchor: markupEnd + 1 },
  };
};

export type EnterRule = (node: OrgNode, cursorPos: number) => TransactionSpec | undefined;

const clearEmptyHeadline = (node: OrgNode): TransactionSpec | undefined => {
  if (!node.is(NodeType.Operator)) return;

  const title = node.parent;
  if (!title?.is(NodeType.Title)) return;

  const headline = title.parent;
  if (!headline?.is(NodeType.Headline)) return;

  const children = title.children ? [...title.children] : [];
  const hasContent = children.some(
    (n) => n.isNot(NodeType.Operator) && n.rawValue.trim().length > 0,
  );
  if (hasContent) return;

  return {
    changes: { from: headline.start, to: headline.end, insert: '' },
    selection: { anchor: headline.start },
  };
};

const isListOrHeadlineOperator = (node: OrgNode): boolean =>
  !!node.parent?.is(NodeType.Title) || !!node.parent?.is(NodeType.ListItem);

const newLineAfterEmptyBullet = (node: OrgNode): TransactionSpec | undefined => {
  if (!node.is(NodeType.Operator) || !isListOrHeadlineOperator(node)) {
    return;
  }
  return {
    changes: { from: node.start, to: node.end, insert: '' },
  };
};

const getListItemIndent = (titleNode: OrgNode): string =>
  titleNode.children?.find((child) => child.is(NodeType.Indent))?.rawValue ?? '';

const getListItemOperator = (titleNode: OrgNode): string | undefined =>
  titleNode.children?.find((child) => child.is(NodeType.Operator))?.rawValue.trim();

const hasListItemCheckbox = (titleNode: OrgNode): boolean =>
  !!titleNode.children?.find((child) => child.is(NodeType.Checkbox));
const getIncrementedOrderedOperator = (operator: string): string | undefined => {
  const orderedOperatorMatch = operator.match(/^(\d+)([.)])$/);
  if (!orderedOperatorMatch) return undefined;

  const [, rawNumber, delimiter] = orderedOperatorMatch;
  return `${Number(rawNumber) + 1}${delimiter}`;
};



const newListItem = (node: OrgNode, cursorPos: number): TransactionSpec | undefined => {
  const titleNode = findParent(node, (n) => {
    if (n.isNot(NodeType.Title)) return false;
    if (n.parent?.isNot(NodeType.ListItem)) return [false, true];
    return true;
  });

  if (node.is(NodeType.NewLine) || !node.parent?.parent || !titleNode) {
    return;
  }

  const listItem = titleNode.parent;
  if (!listItem?.is(NodeType.ListItem)) return;

  if (cursorPos < titleNode.start || cursorPos > titleNode.end) return;

  const operator = getListItemOperator(titleNode);
  if (!operator) return;

  const indentation = getListItemIndent(titleNode);
  const checkbox = hasListItemCheckbox(titleNode) ? '[ ] ' : '';
  const newOperator = listItem.parent?.ordered
    ? getIncrementedOrderedOperator(operator)
    : operator;
  if (!newOperator) return;

  const charAtCursor = titleNode.rawValue[cursorPos - titleNode.start];
  const skipSpace = charAtCursor === ' ' ? 1 : 0;
  const prefix = `\n${indentation}${newOperator} ${checkbox}`;

  return {
    changes: { from: cursorPos, to: cursorPos + skipSpace, insert: prefix },
    selection: { anchor: cursorPos + prefix.length },
  };
};

const blockFooter = (node: OrgNode): TransactionSpec | undefined => {
  if (node.parent?.isNot(NodeType.Keyword) || !node.rawValue.toLowerCase().startsWith('#+begin_')) {
    return;
  }

  const keyword = node.rawValue.toLowerCase().split(' ')[0]?.replace('#+begin_', '') ?? '';

  return {
    changes: { from: node.end, insert: `\n\n#+end_${keyword}` },
    selection: { anchor: node.end + 1 },
  };
};

const BLOCK_TYPES = [
  NodeType.SrcBlock,
  NodeType.QuoteBlock,
  NodeType.ExampleBlock,
  NodeType.ExportBlock,
  NodeType.CommentBlock,
] as const;

const isBlockType = (node: OrgNode): boolean => BLOCK_TYPES.some((type) => node.is(type));

const exitBlockOnNewLine = (node: OrgNode): TransactionSpec | undefined => {
  const parent = node.parent;

  if (node.isNot(NodeType.NewLine) || !parent || !isBlockType(parent)) {
    return;
  }

  const prevSibling = node.prev;
  const isAfterBlockBody = prevSibling?.is(NodeType.BlockBody);
  if (!isAfterBlockBody) return;

  return {
    changes: [
      { from: node.start, to: node.end, insert: '' },
      { from: parent.end, insert: '\n' },
    ],
    selection: { anchor: parent.end },
  };
};

const exitList = (node: OrgNode): TransactionSpec | undefined => {
  const titleParent = findParent(node, (n) => {
    if (n.isNot(NodeType.Title)) return false;
    if (n.parent?.isNot(NodeType.ListItem)) return [false, true];
    return true;
  });

  if (!titleParent) return;

  const listItem = node.parent?.parent;
  if (!listItem) return;

  const isCheckList = titleParent?.children.get(1)?.is(NodeType.Checkbox);
  const rawValue = titleParent.children
    ?.slice(isCheckList ? 2 : 1)
    .map((n: OrgNode) => n.rawValue)
    .join('')
    .trim();

  if (rawValue) return;

  return {
    changes: { from: listItem.start, to: node.end, insert: '\n' },
    selection: { anchor: listItem.start },
  };
};

const exitIndentedBlock = (node: OrgNode): TransactionSpec | undefined => {
  if (node.isNot(NodeType.Indent)) return;

  return {
    changes: { from: node.start, to: node.end, insert: '' },
    selection: { anchor: node.start },
  };
};

const exitBlockOnEmptyLines = (node: OrgNode): TransactionSpec | undefined => {
  const parent = node.parent;
  const grandParent = parent?.parent;

  if (
    node.isNot(NodeType.Text) ||
    !parent?.is(NodeType.BlockBody) ||
    !grandParent ||
    !isBlockType(grandParent)
  ) {
    return;
  }

  const trailingNewlines = node.value.match(/\n{2,}$/);
  if (!trailingNewlines) return;

  const newlinesToRemove = trailingNewlines[0].length;
  const contentEnd = node.end - newlinesToRemove;

  return {
    changes: [
      { from: contentEnd, to: node.end, insert: '' },
      { from: grandParent.end, insert: '\n' },
    ],
    selection: { anchor: grandParent.end - newlinesToRemove + 1 },
  };
};

const indentListItemSection = (node: OrgNode): TransactionSpec | undefined => {
  const parentSection = findParent(node, (n) => {
    if (n.isNot(NodeType.Section)) return false;
    if (!n.parent?.is(NodeType.ListItem)) return [false, true];
    return true;
  });

  if (!parentSection) return;

  return {
    changes: { from: node.end, to: node.end, insert: '\n ' },
    selection: { anchor: node.end + 2 },
  };
};

const isEmptyTableRow = (tableRow: OrgNode): boolean => {
  const content = tableRow.rawValue.replace(/\|/g, '').replace(/\s/g, '');
  return content.length === 0;
};

const exitEmptyTableRow = (node: OrgNode): TransactionSpec | undefined => {
  const tableRow = findParent(node, (n) => n.is(NodeType.TableRow));
  if (!tableRow) return;

  if (!isEmptyTableRow(tableRow)) return;

  const table = tableRow.parent;
  if (!table?.is(NodeType.Table)) return;

  const prevNewLine = tableRow.prev?.is(NodeType.NewLine) ? tableRow.prev : null;
  const deleteFrom = prevNewLine?.start ?? tableRow.start;

  return {
    changes: { from: deleteFrom, to: tableRow.end, insert: '\n' },
    selection: { anchor: deleteFrom + 1 },
  };
};

const newTableRow = (node: OrgNode): TransactionSpec | undefined => {
  const tableRow = findParent(node, (n) => n.is(NodeType.TableRow));
  if (!tableRow) return;

  const table = tableRow.parent;
  if (!table?.is(NodeType.Table)) return;

  const isRowClosed = tableRow.rawValue.trimEnd().endsWith('|');
  const closingPipe = isRowClosed ? '' : ' |';

  const insert = `${closingPipe}\n|  |`;
  const cursorOffset = closingPipe.length + 3;

  return {
    changes: { from: node.end, insert },
    selection: { anchor: node.end + cursorOffset },
  };
};

export const enterRules: readonly EnterRule[] = [
  exitMarkupOnEnter,
  clearEmptyHeadline,
  exitList,
  exitBlockOnEmptyLines,
  newLineAfterEmptyBullet,
  newListItem,
  blockFooter,
  exitBlockOnNewLine,
  exitIndentedBlock,
  indentListItemSection,
  exitEmptyTableRow,
  newTableRow,
];
