export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasHeaderGetter = (headers: unknown): headers is { get: (name: string) => unknown } =>
  isRecord(headers) && typeof headers.get === 'function';

const toHeaderValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

export const getHttpHeader = (headers: unknown, name: string): string | undefined => {
  if (hasHeaderGetter(headers)) return toHeaderValue(headers.get(name));
  if (!isRecord(headers)) return undefined;
  const normalizedName = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName);
  return toHeaderValue(entry?.[1]);
};
