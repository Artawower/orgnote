import type { OrgNode } from 'org-mode-ast';
import { NodeType, walkTree } from 'org-mode-ast';

const containsOffset = (node: OrgNode, offset: number): boolean =>
  node.start <= offset && offset < node.end;

export const findHeadlineAt = (
  root: OrgNode,
  offset: number
): OrgNode | undefined => {
  let deepest: OrgNode | undefined;
  walkTree(root, (node) => {
    if (node.is(NodeType.Headline) && containsOffset(node, offset)) {
      deepest = node;
    }
    return false;
  });
  return deepest;
};

export const collectAllHeadlines = (root: OrgNode): OrgNode[] => {
  const headlines: OrgNode[] = [];
  walkTree(root, (node) => {
    if (node.is(NodeType.Headline)) headlines.push(node);
    return false;
  });
  return headlines;
};
