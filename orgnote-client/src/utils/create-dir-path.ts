export function createDirPath(path: string): string {
  if (path.endsWith('/')) {
    return path;
  }
  return `${path}/`;
}
