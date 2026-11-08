import { editOrgDocument } from 'orgnote-api/utils';
import { TASK_DONE_KEYWORD } from '../constants';

export const undoRecurringCompletion = (
  content: string,
  headlineStart: number,
  doneDate: string,
): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h) return;
    const removed = h.logbook.removeStateChange({ to: TASK_DONE_KEYWORD, date: doneDate });
    if (!removed) return;
    h.scheduled.rewindRepeater();
    h.deadline.rewindRepeater();
  });
