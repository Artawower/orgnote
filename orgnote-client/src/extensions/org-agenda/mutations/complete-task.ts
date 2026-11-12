import { editOrgDocument } from 'orgnote-api/utils';
import { TASK_DONE_KEYWORD } from '../constants';

export const completeTask = (content: string, headlineStart: number, completedAt: Date): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h || h.todoKeyword === undefined) return;
    const fromKeyword = h.todoKeyword;
    h.setTodoKeyword(TASK_DONE_KEYWORD);
    h.closed.set(completedAt);
    h.logbook.appendStateChange({
      from: fromKeyword,
      to: TASK_DONE_KEYWORD,
      at: completedAt,
    });
  });
