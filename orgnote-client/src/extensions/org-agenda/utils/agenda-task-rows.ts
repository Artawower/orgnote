import type { AgendaTaskGroup, AgendaTaskView } from '../composables/use-agenda-tasks';

interface AgendaRowBase {
  readonly key: string;
  readonly filePath: string;
  readonly group: AgendaTaskGroup;
  readonly isGroupEnd: boolean;
}

export interface AgendaGroupRow extends AgendaRowBase {
  readonly kind: 'group';
}

export interface AgendaTaskRowItem extends AgendaRowBase {
  readonly kind: 'task';
  readonly task: AgendaTaskView;
}

export type AgendaTaskListRow = AgendaGroupRow | AgendaTaskRowItem;

const toGroupRow = (group: AgendaTaskGroup, isExpanded: boolean): AgendaGroupRow => ({
  kind: 'group',
  key: `group:${group.filePath}`,
  filePath: group.filePath,
  group,
  isGroupEnd: !isExpanded || !group.tasks.length,
});

const toTaskRow = (
  group: AgendaTaskGroup,
  task: AgendaTaskView,
  index: number,
): AgendaTaskRowItem => ({
  kind: 'task',
  key: `task:${group.filePath}:${task.id}`,
  filePath: group.filePath,
  group,
  task,
  isGroupEnd: index === group.tasks.length - 1,
});

const toGroupRows = (group: AgendaTaskGroup, isExpanded: boolean): AgendaTaskListRow[] => [
  toGroupRow(group, isExpanded),
  ...(isExpanded ? group.tasks.map((task, index) => toTaskRow(group, task, index)) : []),
];

export const buildAgendaTaskRows = (
  groups: readonly AgendaTaskGroup[],
  isGroupExpanded: (filePath: string) => boolean,
): AgendaTaskListRow[] =>
  groups.flatMap((group) => toGroupRows(group, isGroupExpanded(group.filePath)));
