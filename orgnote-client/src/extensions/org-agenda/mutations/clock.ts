import { editOrgDocument } from 'orgnote-api/utils';

export const openClock = (content: string, headlineStart: number, startedAt: Date): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h || !h.node.section) return;
    h.logbook.openClock(startedAt);
  });

export const closeClock = (
  content: string,
  headlineStart: number,
  startedAt: Date,
  endedAt: Date,
): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h || !h.node.section) return;
    h.logbook.closeClock({ start: startedAt, end: endedAt });
  });

export const appendClock = (
  content: string,
  headlineStart: number,
  startedAt: Date,
  endedAt: Date,
): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h || !h.node.section) return;
    h.logbook.appendClock({ start: startedAt, end: endedAt });
  });
