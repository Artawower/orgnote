import { editOrgDocument } from 'orgnote-api/utils';
import { TASK_DONE_KEYWORD, TASK_TODO_KEYWORD } from '../constants';

export const reopenTask = (content: string, headlineStart: number, now = new Date()): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h || h.todoKeyword === undefined) return;
    h.setTodoKeyword(TASK_TODO_KEYWORD);
    h.closed.clear();
    h.logbook.appendStateChange({
      from: TASK_DONE_KEYWORD,
      to: TASK_TODO_KEYWORD,
      at: now,
    });
  });
