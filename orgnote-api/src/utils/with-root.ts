export function withRoot(path: string): string {
  if (path.startsWith('/')) {
    return path;
  }
  return `/${path}`;
}
