import { getFileDirPath } from './get-file-dir-path';

const ORG_EXTENSION = '.org';
const PATH_SEPARATOR_REGEX = /[/\\]/g;

export const buildNoteContent = (noteId: string, title: string): string =>
  `:PROPERTIES:\n:ID: ${noteId}\n:END:\n#+TITLE: ${title}\n`;

const sanitizeFileName = (title: string): string =>
  title.replace(PATH_SEPARATOR_REGEX, '_');

export const buildNoteFilePath = (title: string, currentFilePath: string): string => {
  const dir = getFileDirPath(currentFilePath);
  const fileName = `${sanitizeFileName(title)}${ORG_EXTENSION}`;
  if (dir === '/') return fileName;
  return `${dir}/${fileName}`;
};
