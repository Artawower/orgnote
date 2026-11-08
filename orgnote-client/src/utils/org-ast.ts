import { NodeType, type OrgNode } from 'org-mode-ast';

const TOGGLEABLE_TYPES = [NodeType.Headline, NodeType.ListItem] as const;

export const findNodeAtLine = (
  orgNode: OrgNode | undefined,
  lineStart: number,
): OrgNode | undefined => {
  if (!orgNode?.children) return undefined;

  for (const child of orgNode.children) {
    if (child.start > lineStart) {
      break;
    }

    if (child.start < lineStart) {
      const nested = findNodeAtLine(child, lineStart);
      if (nested) return nested;
      continue;
    }

    if (child.is(...TOGGLEABLE_TYPES)) return child;

    const nested = findNodeAtLine(child, lineStart);
    if (nested) return nested;
  }

  return undefined;
};

export const getHeadlinePrefix = (node: OrgNode): string => {
  if (!node.is(NodeType.Headline)) return '';
  return '*'.repeat(node.level) + ' ';
};

export const getListItemPrefix = (node: OrgNode): string => {
  if (!node.is(NodeType.ListItem)) return '';

  const titleChildren = node.title?.childrenList;
  if (!titleChildren) return '';

  const operator = titleChildren.find((c) => c.is(NodeType.Operator));
  const checkbox = titleChildren.find((c) => c.is(NodeType.Checkbox));

  const operatorValue = operator?.value ?? '';
  const checkboxValue = checkbox ? checkbox.value + ' ' : '';

  return operatorValue + checkboxValue;
};

export const getNodePrefix = (node: OrgNode): string => {
  if (node.is(NodeType.Headline)) return getHeadlinePrefix(node);
  if (node.is(NodeType.ListItem)) return getListItemPrefix(node);
  return '';
};

export const getNodePrefixRange = (node: OrgNode): { from: number; to: number } => {
  const prefix = getNodePrefix(node);
  return { from: node.start, to: node.start + prefix.length };
};

export const isHeadline = (node: OrgNode): boolean => node.is(NodeType.Headline);

export const isListItem = (node: OrgNode): boolean => node.is(NodeType.ListItem);

export const isOrderedListItem = (node: OrgNode): boolean => {
  if (!node.is(NodeType.ListItem)) return false;
  return node.parent?.ordered ?? false;
};

export const hasCheckbox = (node: OrgNode): boolean => {
  if (!node.is(NodeType.ListItem)) return false;
  return node.title?.childrenList?.some((c) => c.is(NodeType.Checkbox)) ?? false;
};

export const isBulletListItem = (node: OrgNode): boolean =>
  isListItem(node) && !isOrderedListItem(node) && !hasCheckbox(node);

export const isNumericListItem = (node: OrgNode): boolean =>
  isListItem(node) && isOrderedListItem(node);

export const isCheckboxListItem = (node: OrgNode): boolean =>
  isListItem(node) && hasCheckbox(node);

export const isToggleableNode = (node: OrgNode): boolean => node.is(...TOGGLEABLE_TYPES);
