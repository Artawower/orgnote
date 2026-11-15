import type { OrgNode } from 'org-mode-ast';
import type { OrgDocument, OrgHeadline } from './types';
import { collectAllHeadlines, findHeadlineAt } from './shared/find-headline-at';
import { createOrgHeadline } from './features/headline';
import { createRootProperties } from './features/properties';

export const createOrgDocument = (root: OrgNode): OrgDocument => {
  const buildHeadline = (node: OrgNode): OrgHeadline => createOrgHeadline(node);

  return {
    root,
    properties: createRootProperties(root),
    headlineAt: (offset) => {
      const node = findHeadlineAt(root, offset);
      return node ? buildHeadline(node) : undefined;
    },
    headlines: () => collectAllHeadlines(root).map(buildHeadline),
    findHeadline: (predicate) => {
      for (const node of collectAllHeadlines(root)) {
        const wrapped = buildHeadline(node);
        if (predicate(wrapped)) return wrapped;
      }
      return undefined;
    },
  };
};
