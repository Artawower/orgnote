import { editOrgDocument } from 'orgnote-api/utils';

export const changeTaskBody = (content: string, headlineStart: number, newBody: string): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h || !h.node.section) return;
    h.setBody(newBody);
  });
