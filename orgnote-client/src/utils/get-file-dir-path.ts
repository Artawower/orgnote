const PATH_DELIMITER_SLASH = '/';

export function getFileDirPath(filePath: string | string[]): string {
  const path = (
    typeof filePath === 'string'
      ? filePath.split(PATH_DELIMITER_SLASH)
      : filePath
  )
    .slice(0, -1)
    .join('/');

  return path || '/';
}
