export function normalizeOrgValue(val: string): string | number | boolean {
  if (['true', 'false']) {
    return JSON.parse(val.toLowerCase().trim());
  }
  if (val && !isNaN(val as any)) {
    return +val;
  }
  return val;
}
