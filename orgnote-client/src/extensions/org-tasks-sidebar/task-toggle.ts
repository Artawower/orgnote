import { parse, NodeType, walkTree } from 'org-mode-ast';
import type { OrgNode } from 'org-mode-ast';
import type { FileTaskKind } from 'orgnote-api';

export interface ToggleTaskInput {
  taskKind: FileTaskKind;
  start: number;
}

const checkboxDone = '[X]';
const checkboxTodo = '[ ]';
const keywordDone = 'DONE';
const keywordTodo = 'TODO';
const todoKeywordDeclarationKey = '#+todo:';

const replaceRange = (content: string, start: number, end: number, replacement: string): string =>
  content.slice(0, start) + replacement + content.slice(end);

const normalizeTodoKeywordToken = (token: string): string => {
  return token.replace(/\(.*$/, '').trim();
};

const getNestedNodes = (node: OrgNode): OrgNode[] => {
  const extras = [node.title, node.section].filter((n): n is OrgNode => n !== undefined);
  return [...extras, ...(node.childrenList ?? [])];
};

const findTaskNode = (node: OrgNode, targetStart: number): OrgNode | undefined => {
  if ((node.is(NodeType.Headline) || node.is(NodeType.ListItem)) && node.start === targetStart) {
    return node;
  }
  for (const child of getNestedNodes(node)) {
    const found = findTaskNode(child, targetStart);
    if (found) return found;
  }
  return undefined;
};

const findNode = (
  node: OrgNode,
  predicate: (candidate: OrgNode) => boolean,
): OrgNode | undefined => {
  let foundNode: OrgNode | undefined;

  walkTree(node, (candidate) => {
    if (foundNode) {
      return true;
    }

    if (predicate(candidate)) {
      foundNode = candidate;
      return true;
    }

    return false;
  });

  return foundNode;
};

const findToggleTarget = (node: OrgNode, taskKind: FileTaskKind): OrgNode | undefined => {
  const titleChildren = node.title?.childrenList ?? [];
  if (taskKind === 'headline-todo') {
    return titleChildren.find((c) => c.is(NodeType.TodoKeyword));
  }
  return titleChildren.find((c) => c.is(NodeType.Checkbox));
};

const isTodoKeywordDeclarationNode = (node: OrgNode): boolean => {
  if (node.isNot(NodeType.Keyword)) {
    return false;
  }

  const key = node.children?.first?.value.trim().toLowerCase();
  return key === todoKeywordDeclarationKey;
};

const extractDefaultTodoKeyword = (root: OrgNode): string => {
  const declarationNode = findNode(root, isTodoKeywordDeclarationNode);
  const sequence = declarationNode?.children?.last?.rawValue?.trim();
  if (!sequence) {
    return keywordTodo;
  }

  const [todoPart] = sequence.split('|');
  const firstKeyword = todoPart
    ?.trim()
    .split(/\s+/)
    .map((keyword) => normalizeTodoKeywordToken(keyword))
    .filter(Boolean)[0];

  return firstKeyword ?? keywordTodo;
};

const resolveReplacement = (
  target: OrgNode,
  taskKind: FileTaskKind,
  defaultTodoKeyword: string,
): string => {
  if (taskKind === 'headline-todo') {
    return target.value?.trim().toUpperCase() === keywordDone ? defaultTodoKeyword : keywordDone;
  }
  return target.checked ? checkboxTodo : checkboxDone;
};

export const toggleTaskInContent = (content: string, task: ToggleTaskInput): string | undefined => {
  const root = parse(content);
  const defaultTodoKeyword = extractDefaultTodoKeyword(root);
  const taskNode = findTaskNode(root, task.start);
  if (!taskNode) return undefined;
  const target = findToggleTarget(taskNode, task.taskKind);
  if (!target) return undefined;
  return replaceRange(
    content,
    target.start,
    target.end,
    resolveReplacement(target, task.taskKind, defaultTodoKeyword),
  );
};
