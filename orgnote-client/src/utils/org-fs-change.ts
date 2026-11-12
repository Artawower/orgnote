import { isOrgFile } from 'orgnote-api';
import type { FileSystemChange } from 'orgnote-api';

const lastSegment = (path: string): string => path.split('/').filter(Boolean).at(-1) ?? '';

const hasFileExtension = (path: string): boolean => lastSegment(path).lastIndexOf('.') > 0;

const isDirectoryLikePath = (path: string): boolean => !hasFileExtension(path);

const isRenameAffectingOrg = (change: FileSystemChange): boolean => {
  const fromOrg = !!change.previousPath && isOrgFile(change.previousPath);
  return fromOrg || isDirectoryLikePath(change.path);
};

export const affectsOrgIndex = (change: FileSystemChange): boolean => {
  if (isOrgFile(change.path)) return true;
  if (change.type === 'delete') return isDirectoryLikePath(change.path);
  if (change.type === 'rename') return isRenameAffectingOrg(change);
  return false;
};
