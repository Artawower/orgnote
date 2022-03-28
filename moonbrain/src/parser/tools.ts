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

export const trim = (str: string, ch: string): string => {
  let start = 0,
    end = str.length;

  while (start < end && str[start] === ch) ++start;

  while (end > start && str[end - 1] === ch) --end;

  return start > 0 || end < str.length ? str.substring(start, end) : str;
};

/*
 * Wrap function result as array
 */
export const Arrayify =
  () =>
  <T>(target: Function): (() => T[]) => {
    const wrapperFn = (...args: any[]): T[] => {
      return [target(...args)];
    };
    return wrapperFn;
  };

export const asArray = Arrayify();

export const isFileImage = (path: string): boolean => /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i.test(path);
