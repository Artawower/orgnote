export function getStringPath(path: string | string[]): string {
  if (Array.isArray(path)) {
    return `${path.join('/')}`;
  }
  return path;
}
