import type { OrgRepeater } from 'org-mode-ast';
import { format, parseISO } from 'date-fns';
import { editOrgDocument } from '../edit-org-document';

const PARENT_TASK_LEVEL = 1;
const MIN_SAFE_SUBTASK_LEVEL = PARENT_TASK_LEVEL + 1;

const promoteSubtaskHeadlines = (body: string): string => {
  if (!body.trim()) return body;
  return editOrgDocument(body, (doc) => {
    doc
      .headlines()
      .filter((h) => h.level < MIN_SAFE_SUBTASK_LEVEL)
      .forEach((h) => h.setLevel(MIN_SAFE_SUBTASK_LEVEL));
  });
};

export type OrgScheduleRepeater = Pick<OrgRepeater, 'type' | 'value' | 'unit'>;

export interface CreateTaskScheduleInput {
  date: string;
  to?: string;
  repeater?: OrgScheduleRepeater;
  warning?: OrgScheduleRepeater;
}

export interface CreateTaskInput {
  title: string;
  body?: string;
  scheduled?: CreateTaskScheduleInput;
  todoKeyword?: string;
  priority?: string;
  tags?: string[];
  isHabit?: boolean;
}

const DEFAULT_TODO_KEYWORD = 'TODO';

const getDayName = (isoDate: string): string => format(parseISO(isoDate), 'EEE');

const normalizeContent = (content: string): string => {
  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n` : '';
};

const buildPriorityMark = (priority: string | undefined): string =>
  priority ? `[#${priority}] ` : '';

const buildTagsMark = (tags: string[] | undefined): string =>
  tags?.length ? ` :${tags.join(':')}:` : '';

const buildHeadlineLine = (input: CreateTaskInput): string => {
  const keyword = input.todoKeyword ?? DEFAULT_TODO_KEYWORD;
  const priorityMark = buildPriorityMark(input.priority);
  const tagsMark = buildTagsMark(input.tags);
  return `* ${keyword} ${priorityMark}${input.title.trim()}${tagsMark}\n`;
};

const buildRepeaterMark = (repeater: OrgScheduleRepeater | undefined): string =>
  repeater ? ` ${repeater.type}${repeater.value}${repeater.unit}` : '';

const buildTimestamp = (
  date: string,
  repeater: OrgScheduleRepeater | undefined,
  warning: OrgScheduleRepeater | undefined,
): string => `<${date} ${getDayName(date)}${buildRepeaterMark(repeater)}${buildRepeaterMark(warning)}>`;

const buildScheduledLine = (scheduled: CreateTaskScheduleInput): string => {
  const start = buildTimestamp(scheduled.date, scheduled.repeater, scheduled.warning);
  const end = scheduled.to ? `--${buildTimestamp(scheduled.to, undefined, undefined)}` : '';
  return `SCHEDULED: ${start}${end}\n`;
};

const buildPlanningBlock = (scheduled: CreateTaskScheduleInput | undefined): string =>
  scheduled ? buildScheduledLine(scheduled) : '';

const buildHabitBlock = (isHabit: boolean | undefined): string =>
  isHabit ? ':PROPERTIES:\n:STYLE: habit\n:END:\n' : '';

const buildBodyBlock = (body: string | undefined): string =>
  body ? `${promoteSubtaskHeadlines(body.trim())}\n` : '';

export const createTask = (content: string, input: CreateTaskInput): string => {
  const base = normalizeContent(content);
  const headline = buildHeadlineLine(input);
  const planning = buildPlanningBlock(input.scheduled);
  const habit = buildHabitBlock(input.isHabit);
  const body = buildBodyBlock(input.body);
  return `${base}${headline}${planning}${habit}${body}`;
};
