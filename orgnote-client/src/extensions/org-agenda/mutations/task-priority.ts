import { NodeType, parse, withMetaInfo, walkTree } from 'org-mode-ast';
import type { OrgNode } from 'org-mode-ast';
import { isPresent } from 'orgnote-api/utils';

type PriorityNodes = {
  priorityNode: OrgNode | null;
  todoKeywordEnd: number | null;
  starEnd: number | null;
};

const findPriorityNodes = (content: string, headlineStart: number): PriorityNodes => {
  const ast = withMetaInfo(parse(content));
  const result: PriorityNodes = { priorityNode: null, todoKeywordEnd: null, starEnd: null };
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
    if (!inTarget) return false;
    if (node.is(NodeType.Priority)) result.priorityNode = node;
    if (node.is(NodeType.TodoKeyword)) result.todoKeywordEnd = node.end;
    if (node.is(NodeType.Operator) && node.start === headlineStart) result.starEnd = node.end;
    return false;
  });

  return result;
};

export const changeTaskPriority = (
  content: string,
  headlineStart: number,
  priority: string | undefined,
): string => {
  const { priorityNode, todoKeywordEnd, starEnd } = findPriorityNodes(content, headlineStart);

  if (priorityNode) {
    const before = content.slice(0, priorityNode.start).replace(/ $/, '');
    const after = content.slice(priorityNode.end);
    if (!priority) return before + after;
    return `${before} [#${priority}]${after}`;
  }

  if (!priority) return content;

  if (isPresent(todoKeywordEnd)) {
    return `${content.slice(0, todoKeywordEnd)} [#${priority}]${content.slice(todoKeywordEnd)}`;
  }

  const insertAt = starEnd ?? headlineStart + 2;
  return `${content.slice(0, insertAt)}[#${priority}] ${content.slice(insertAt)}`;
};
