type MaybeFn<TValue, TArgs extends unknown[] = []> =
  | TValue
  | ((...args: TArgs) => TValue)
  | undefined;

export function resolveValue<TValue, TArgs extends unknown[] = []>(
  value?: MaybeFn<TValue, TArgs>,
  ...args: TArgs
): TValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === 'function'
    ? (value as (...params: TArgs) => TValue)(...args)
    : value;
}
