import type { OrgNode } from 'org-mode-ast';
import type { CommonEmbeddedWidget } from 'orgnote-api';

export const findHighestPriorityWidget = <T extends CommonEmbeddedWidget>(
  widgets: T[] | undefined,
  node: OrgNode,
): T | undefined => {
  if (!widgets?.length) return undefined;

  const matched = widgets.filter((w) => !w.satisfied || w.satisfied(node));
  if (matched.length === 0) return undefined;
  if (matched.length === 1) return matched[0];

  return matched.reduce((highest, current) =>
    (current.priority ?? 0) > (highest.priority ?? 0) ? current : highest,
  );
};
