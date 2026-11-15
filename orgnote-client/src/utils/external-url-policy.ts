const OPENABLE_EXTERNAL_URL_PROTOCOLS = new Set(['http:', 'https:']);

export const toOpenableExternalUrl = (url: string): URL | undefined => {
  const value = url.trim();
  if (!URL.canParse(value)) return undefined;
  const parsed = new URL(value);
  return OPENABLE_EXTERNAL_URL_PROTOCOLS.has(parsed.protocol) ? parsed : undefined;
};
