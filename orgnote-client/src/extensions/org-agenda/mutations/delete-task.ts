import { editOrgDocument } from 'orgnote-api/utils';

export const deleteTask = (content: string, headlineStart: number): string =>
  editOrgDocument(content, (doc) => doc.headlineAt(headlineStart)?.remove());
