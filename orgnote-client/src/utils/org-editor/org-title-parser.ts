import { NodeType, parse, walkTree, withMetaInfo } from 'org-mode-ast';
import type { OrgNode } from 'org-mode-ast';

const HEADLINE_PREFIX = '* ';

export interface TitlePriorityInfo {
  letter: string;
  from: number;
  to: number;
}

const parseTitleAsHeadline = (title: string) => withMetaInfo(parse(`${HEADLINE_PREFIX}${title}`));

export const extractPriorityFromTitle = (title: string): TitlePriorityInfo | null => {
  const ast = parseTitleAsHeadline(title);
  let result: TitlePriorityInfo | null = null;

  walkTree(ast, (node: OrgNode): boolean => {
    if (!node.is(NodeType.Priority)) return false;
    const textNode = node.childrenList?.find((c) => c.is(NodeType.Text));
    const letter = textNode?.value?.replace('#', '');
    if (!letter) return false;
    result = {
      letter,
      from: node.start - HEADLINE_PREFIX.length,
      to: node.end - HEADLINE_PREFIX.length,
    };
    return false;
  });

  return result;
};

export const removePriorityFromTitle = (title: string): string => {
  const info = extractPriorityFromTitle(title);
  if (!info) return title;
  return (title.slice(0, info.from) + title.slice(info.to)).trimStart();
};
