import type { FileMeta } from 'orgnote-api';
import { createLogbook, createProperties } from 'orgnote-api/utils';
import { format } from 'date-fns';
import { NodeType, type OrgNode, type Heading } from 'org-mode-ast';

const isHabitHeadline = (node: OrgNode): boolean =>
  Object.entries(createProperties(node).entries).some(
    ([key, value]) => key.toLowerCase() === 'style' && value.toLowerCase() === 'habit',
  );

const extractDoneDates = (headline: OrgNode): string[] =>
  createLogbook(headline)
    .entries.filter((entry) => entry.toKeyword === 'DONE' && entry.timestamp)
    .map((entry) => format(entry.timestamp!, 'yyyy-MM-dd'));

const extractLastDoneAt = (headline: OrgNode): string | undefined =>
  extractDoneDates(headline).sort().at(-1);

type FileTask = NonNullable<FileMeta['tasks']>[number];
type FileTaskState = FileTask['state'];
type HeadingsByStart = Map<number, Heading>;

const doneTodoKeyword = 'DONE';
const todoState: FileTaskState = 'todo';
const doneState: FileTaskState = 'done';

const getTitleChildren = (node: OrgNode): OrgNode[] => node.title?.childrenList ?? [];

const findTitleChild = (node: OrgNode, type: NodeType): OrgNode | undefined =>
  getTitleChildren(node).find((child) => child.is(type));

const resolveCheckboxState = (checkboxNode: OrgNode): FileTaskState =>
  checkboxNode.checked ? doneState : todoState;

const resolveTodoState = (todoKeywordNode: OrgNode): FileTaskState => {
  const keyword = todoKeywordNode.value?.trim().toUpperCase() ?? '';
  return keyword === doneTodoKeyword ? doneState : todoState;
};

const extractTaskText = (node: OrgNode): string =>
  getTitleChildren(node)
    .filter(
      (child) =>
        child.isNot(NodeType.Operator) &&
        child.isNot(NodeType.Checkbox) &&
        child.isNot(NodeType.TodoKeyword) &&
        child.isNot(NodeType.Priority) &&
        child.isNot(NodeType.TagList) &&
        child.isNot(NodeType.NewLine),
    )
    .map((child) => child.rawValue ?? child.value ?? '')
    .join('')
    .trim();

const buildTaskId = (filePath: string, node: OrgNode, kind: FileTask['kind']): string =>
  `${filePath}|${kind}|${node.start}|${node.end}`;

const buildAgendaFields = (node: OrgNode, heading: Heading | undefined): Partial<FileTask> => ({
  priority: heading?.priority,
  tags: heading?.tags,
  todoKeyword: heading?.todoKeyword,
  scheduled: heading?.scheduled,
  deadline: heading?.deadline,
  closed: heading?.closed,
  clocks: heading?.clocks,
  lastDoneAt: extractLastDoneAt(node),
  doneDates: extractDoneDates(node),
  isHabit: isHabitHeadline(node) || undefined,
});

const createHeadlineTask = (
  node: OrgNode,
  filePath: string,
  kind: Extract<FileTask['kind'], 'headline-checkbox' | 'headline-todo'>,
  state: FileTaskState,
  agendaFields: Partial<FileTask>,
): FileTask => ({
  id: buildTaskId(filePath, node, kind),
  kind,
  state,
  text: extractTaskText(node),
  start: node.start,
  end: node.end,
  ...agendaFields,
});

const createTaskFromHeadline = (
  node: OrgNode,
  filePath: string,
  headingsByStart: HeadingsByStart,
): FileTask | undefined => {
  const agendaFields = buildAgendaFields(node, headingsByStart.get(node.start));
  const checkboxNode = findTitleChild(node, NodeType.Checkbox);
  if (checkboxNode) {
    return createHeadlineTask(
      node,
      filePath,
      'headline-checkbox',
      resolveCheckboxState(checkboxNode),
      agendaFields,
    );
  }
  const todoKeywordNode = findTitleChild(node, NodeType.TodoKeyword);
  if (!todoKeywordNode) return undefined;
  return createHeadlineTask(
    node,
    filePath,
    'headline-todo',
    resolveTodoState(todoKeywordNode),
    agendaFields,
  );
};

const createTaskFromListItem = (node: OrgNode, filePath: string): FileTask | undefined => {
  const checkboxNode = findTitleChild(node, NodeType.Checkbox);
  if (!checkboxNode) return undefined;
  return {
    id: buildTaskId(filePath, node, 'list-checkbox'),
    kind: 'list-checkbox',
    state: resolveCheckboxState(checkboxNode),
    text: extractTaskText(node),
    start: node.start,
    end: node.end,
  };
};

const createTaskFromNode = (
  node: OrgNode,
  filePath: string,
  headingsByStart: HeadingsByStart,
): FileTask | undefined => {
  if (node.is(NodeType.Headline)) {
    return createTaskFromHeadline(node, filePath, headingsByStart);
  }
  if (node.is(NodeType.ListItem)) {
    return createTaskFromListItem(node, filePath);
  }
  return undefined;
};

const getNestedNodes = (node: OrgNode): OrgNode[] => {
  const directNodes = [node.title, node.section].filter(
    (value): value is OrgNode => value !== undefined,
  );
  return [...directNodes, ...node.childrenList];
};

const collectTasks = (
  node: OrgNode,
  filePath: string,
  headingsByStart: HeadingsByStart,
): FileTask[] => {
  const nodeTask = createTaskFromNode(node, filePath, headingsByStart);
  const nestedTasks = getNestedNodes(node).flatMap((child) =>
    collectTasks(child, filePath, headingsByStart),
  );
  return nodeTask ? [nodeTask, ...nestedTasks] : nestedTasks;
};

const buildHeadingsByStart = (root: OrgNode): HeadingsByStart =>
  new Map((root.meta?.headings ?? []).map((h: Heading) => [h.start, h]));

export const extractFileTasks = (root: OrgNode, filePath: string): FileTask[] =>
  collectTasks(root, filePath, buildHeadingsByStart(root));
