import { editOrgDocument } from 'orgnote-api/utils';

export const changeTaskStatus = (
  content: string,
  headlineStart: number,
  newKeyword: string,
): string =>
  editOrgDocument(content, (doc) => {
    const h = doc.headlineAt(headlineStart);
    if (!h || h.todoKeyword === undefined) return;
    h.setTodoKeyword(newKeyword);
  });
