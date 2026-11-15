import { isOrgFile, type FileSystemChange } from 'orgnote-api';

export const isOrgTaskRelatedChange = (change: FileSystemChange): boolean => {
  if (isOrgFile(change.path)) {
    return true;
  }

  if (change.type !== 'rename') {
    return false;
  }

  return isOrgFile(change.previousPath ?? '');
};
