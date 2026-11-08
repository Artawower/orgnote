export function join(...paths: string[]): string {
  const isAbsolute = paths[0]?.startsWith('/');
  const result = paths
    .filter((p) => p !== '/' && p)
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/\/+$/, '');

  if (!result) return isAbsolute ? '/' : '';
  if (isAbsolute && !result.startsWith('/')) return `/${result}`;
  return result;
}
