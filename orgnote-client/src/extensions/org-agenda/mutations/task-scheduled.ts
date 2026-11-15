import { format, parseISO } from 'date-fns';
import type { OrgRepeater } from 'org-mode-ast';
import { editOrgDocument } from 'orgnote-api/utils';

export interface TaskScheduleInput {
  date: string;
  repeater?: OrgRepeater;
  warning?: OrgRepeater;
}

const buildRepeaterMark = (repeater: OrgRepeater | undefined): string =>
  repeater ? ` ${repeater.type}${repeater.value}${repeater.unit}` : '';

const buildScheduledLine = (scheduled: TaskScheduleInput): string =>
  `SCHEDULED: <${scheduled.date} ${format(parseISO(scheduled.date), 'EEE')}${buildRepeaterMark(scheduled.repeater)}${buildRepeaterMark(scheduled.warning)}>\n`;

const lineEndAfter = (content: string, start: number): number => {
  const lineEnd = content.indexOf('\n', start);
  return lineEnd === -1 ? content.length : lineEnd + 1;
};

const isHeadlineLine = (line: string): boolean => /^\*+\s/.test(line);

const shouldInsertPlanningBeforeMutation = (
  content: string,
  headlineStart: number,
  scheduled: TaskScheduleInput | undefined,
): boolean => {
  if (!scheduled) return false;
  const insertAt = lineEndAfter(content, headlineStart);
  const nextLineEnd = content.indexOf('\n', insertAt);
  const nextLine = content.slice(insertAt, nextLineEnd === -1 ? undefined : nextLineEnd);
  return insertAt === content.length || isHeadlineLine(nextLine);
};

const insertScheduledLine = (
  content: string,
  headlineStart: number,
  scheduled: TaskScheduleInput,
): string => {
  const insertAt = lineEndAfter(content, headlineStart);
  const prefix = insertAt === content.length ? '\n' : '';
  return `${content.slice(0, insertAt)}${prefix}${buildScheduledLine(scheduled)}${content.slice(insertAt)}`;
};

export const changeTaskScheduled = (
  content: string,
  headlineStart: number,
  scheduled: TaskScheduleInput | undefined,
): string => {
  if (scheduled && shouldInsertPlanningBeforeMutation(content, headlineStart, scheduled)) {
    return insertScheduledLine(content, headlineStart, scheduled);
  }

  return editOrgDocument(content, (doc) => {
    const headline = doc.headlineAt(headlineStart);
    if (!headline) return;
    if (!scheduled) {
      headline.scheduled.clear();
      return;
    }
    headline.scheduled.set(parseISO(scheduled.date), {
      repeater: scheduled.repeater ?? null,
      warning: scheduled.warning ?? null,
    });
  });
};
