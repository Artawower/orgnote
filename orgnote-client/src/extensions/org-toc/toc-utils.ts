import { walkTree, NodeType, type OrgNode } from 'org-mode-ast';
import type { TocTreeNode } from './toc-tree';

interface HeadlineData {
  label: string;
  level: number;
  position: number;
  endPosition: number;
}

const collectHeadlines = (root: OrgNode): HeadlineData[] => {
  const headlines: HeadlineData[] = [];

  walkTree(root, (node) => {
    if (node.isNot(NodeType.Headline)) return false;

    const label = node.title?.cleanValue?.trim() ?? '';
    if (!label) return false;

    const titleEnd = node.title?.end ?? node.start;
    const endPosition = titleEnd - 1;

    headlines.push({
      label,
      level: node.level ?? 1,
      position: node.start,
      endPosition,
    });

    return false;
  });

  return headlines;
};

const buildTree = (headlines: HeadlineData[]): TocTreeNode[] => {
  const roots: TocTreeNode[] = [];
  const ancestors: TocTreeNode[] = [];

  headlines.forEach((headline, index) => {
    const node: TocTreeNode = {
      id: `toc-${index}`,
      ...headline,
    };

    while (ancestors.length > 0 && ancestors.at(-1)!.level >= headline.level) {
      ancestors.pop();
    }

    const parent = ancestors.at(-1);
    if (!parent) {
      roots.push(node);
      ancestors.push(node);
      return;
    }

    parent.children = parent.children ?? [];
    parent.children.push(node);
    ancestors.push(node);
  });

  return roots;
};

export const collectTocTree = (root: OrgNode): TocTreeNode[] => {
  const headlines = collectHeadlines(root);
  return buildTree(headlines);
};

export const flattenTocTree = (tree: TocTreeNode[]): TocTreeNode[] => {
  const result: TocTreeNode[] = [];

  const traverse = (nodes: TocTreeNode[]) => {
    nodes.forEach((node) => {
      result.push(node);
      if (node.children) {
        traverse(node.children);
      }
    });
  };

  traverse(tree);
  return result;
};
