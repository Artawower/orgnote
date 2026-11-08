import { createDirPath } from './create-dir-path';

export const isPathInsideRoot = (path: string, rootPath: string): boolean =>
  path === rootPath || path.startsWith(createDirPath(rootPath));
