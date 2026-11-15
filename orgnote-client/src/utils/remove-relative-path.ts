export function removeRelativePath(path: string): string {
  return path.replace(/^\.\//, '');
}
