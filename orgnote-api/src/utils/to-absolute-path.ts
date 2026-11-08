export const toAbsolutePath = (path: string): string =>
  path.startsWith('/') ? path : `/${path}`;

export const toRelativePath = (path: string): string =>
  path.startsWith('/') ? path.slice(1) : path;
