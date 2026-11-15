import { editOrgDocument } from 'orgnote-api/utils';
import { TASK_TODO_KEYWORD } from '../constants';

export const completeHabit = (content: string, headlineStart: number, completedAt: Date): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h || !h.scheduled.value?.repeater) return;
    h.setTodoKeyword(TASK_TODO_KEYWORD);
    h.scheduled.advanceRepeater(completedAt);
    h.logbook.appendClock({ start: completedAt, end: completedAt });
  });
