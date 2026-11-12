import { join, ORGNOTE_SYSTEM_ROOT_PATH } from 'orgnote-api';

export function getSystemFilesPath(path: string | string[]): string {
  const normalizedPath = typeof path === 'string' ? path : join(...path);

  return `${ORGNOTE_SYSTEM_ROOT_PATH}/${normalizedPath}`;
}
