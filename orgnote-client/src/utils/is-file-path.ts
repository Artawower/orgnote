export function isFilePath(path: string): boolean {
  return /^.*\/[^/]+\.\w+$/.test(path);
}
