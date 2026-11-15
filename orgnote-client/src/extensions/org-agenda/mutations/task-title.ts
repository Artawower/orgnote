import { editOrgDocument } from 'orgnote-api/utils';

export const changeTaskTitle = (content: string, headlineStart: number, newTitle: string): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h || !h.node.title) return;
    h.setTitle(newTitle);
  });
