import { getFileExtension, isOrgFile } from 'orgnote-api';
import { ORG_EXTENSION } from 'src/constants/org-file-extension';

export const normalizeOrgFilePath = (path: string): string => {
  if (!path) return '';
  if (path.endsWith('/')) return path;

  const fileExtension = getFileExtension(path);
  if (!isOrgFile(path) && !fileExtension) return `${path}.${ORG_EXTENSION}`;

  return path;
};
