export function extractFileNameFromPath(path?: string): string {
  if (!path) {
    return '';
  }
  return path.split('/').pop() || '';
}
