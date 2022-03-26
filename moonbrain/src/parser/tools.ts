/*
 * Remote extra spaces and transform value to lower case
 */
export const normalizeStringValue = (val: string): string => val.toLowerCase().trim();

/*
 * Determine, could the string interpretation of the org value to be a true
 */
export const isTrue = (val: string): boolean => !!['true', 'yes'].find((v) => v === normalizeStringValue(val));

export function normalizeOrgValue(val: string): string | number | boolean {
  const normalizedLiteral = val.toLowerCase().trim();
  if (['true', 'false'].find((v) => v === normalizedLiteral)) {
    return JSON.parse(normalizedLiteral);
  }
  if (val && !isNaN(val as any)) {
    return +val;
  }
  return val;
}
