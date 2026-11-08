import { editOrgDocument } from 'orgnote-api/utils';

export const addHabitClock = (content: string, headlineStart: number, date: Date): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h) return;
    h.logbook.appendClock({ start: date, end: date });
  });
