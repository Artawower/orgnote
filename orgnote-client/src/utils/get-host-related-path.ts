export function getHostRelatedPath(path: string): string {
  const origin = window.location.origin;

  return `${origin}/${path.replace(/^\/+/, '')}`;
}
