import type { OrgNode } from 'org-mode-ast';

export const detachNode = (node: OrgNode): void => {
  node.parent = null;
};
