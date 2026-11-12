export function isNullable<T>(value: T | null | undefined): value is null | undefined {
  return (
    value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))
  );
}

export function isPresent<T>(value: T | null | undefined): value is T {
  return (
    value !== null && value !== undefined && !(typeof value === 'number' && Number.isNaN(value))
  );
}
