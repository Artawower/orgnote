import { isNullable } from 'orgnote-api/utils';

export function arrayToMap<T extends Record<string, unknown>, K extends keyof T = keyof T>(
  array: T[],
  ...args: 'id' extends keyof T ? [key?: K] : [key: K]
): Record<string, T> {
  const [key] = args;
  const keyName = (key ?? 'id') as keyof T;

  return array.reduce<Record<string, T>>((acc, item) => {
    const rawKey = item[keyName];
    if (isNullable(rawKey)) {
      return acc;
    }
    acc[String(rawKey)] = item;
    return acc;
  }, {});
}
