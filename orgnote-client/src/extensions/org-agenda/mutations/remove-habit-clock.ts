import { editOrgDocument } from 'orgnote-api/utils';

export const removeHabitClock = (content: string, headlineStart: number, isoDate: string): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h) return;
    h.logbook.removeClock(isoDate);
  });
