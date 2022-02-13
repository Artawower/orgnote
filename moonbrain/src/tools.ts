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
