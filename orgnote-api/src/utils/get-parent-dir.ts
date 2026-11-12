import { splitPath } from './split-path';

export function getParentDir(path: string | string[]): string {
  if (typeof path === 'string') {
    path = splitPath(path);
  }

  return path.slice(0, -1).join('/');
}
