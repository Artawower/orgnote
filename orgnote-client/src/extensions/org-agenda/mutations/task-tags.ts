import { NodeType, parse, withMetaInfo, walkTree } from 'org-mode-ast';
import type { OrgNode } from 'org-mode-ast';

const formatTags = (tags: readonly string[]): string => (tags.length ? ` :${tags.join(':')}:` : '');

const findTagListNode = (content: string, headlineStart: number): OrgNode | null => {
  const ast = withMetaInfo(parse(content));
  let found: OrgNode | null = null;
  let inTarget = false;

  walkTree(ast, (node: OrgNode): boolean => {
    if (node.is(NodeType.Headline)) {
      if (node.start === headlineStart) {
        inTarget = true;
        return false;
      }
      if (inTarget) return true;
      return false;
    }
    if (inTarget && node.is(NodeType.TagList)) found = node;
    return false;
  });

  return found;
};

export const changeTaskTags = (
  content: string,
  headlineStart: number,
  tags: readonly string[],
): string => {
  const tagList = findTagListNode(content, headlineStart);
  const newTagsStr = formatTags(tags);

  if (tagList) {
    return content.slice(0, tagList.start).trimEnd() + newTagsStr + content.slice(tagList.end);
  }

  if (!newTagsStr) return content;

  const lineEnd = content.indexOf('\n', headlineStart);
  const end = lineEnd === -1 ? content.length : lineEnd;
  return content.slice(0, end) + newTagsStr + content.slice(end);
};
