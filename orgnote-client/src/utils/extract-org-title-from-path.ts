import { extractFileNameFromPath } from './extract-file-name-from-path';

export const extractOrgTitleFromPath = (filePath: string): string => {
  const fileName = extractFileNameFromPath(filePath);
  return fileName.replace(/\.org(\.gpg)?$/, '');
};
