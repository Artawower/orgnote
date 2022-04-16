import { OrgNode } from 'uniorg';
import { v4 as uuid } from 'uuid';

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
// TODO: master Right not this function will wrap only first argument from array as nested array
export const Arrayify =
  () =>
  <T>(target: Function): (() => [T[], OrgNode]) => {
    const wrapperFn = (...args: any[]): [T[], OrgNode] => {
      const res = target(...args);
      return [[res[0]], res[1]];
    };
    return wrapperFn;
  };

export const asArray = Arrayify();

export const isFileImage = (path: string): boolean => /\.(gif|svg|jpe?g|tiff?|png|webp|bmp)$/i.test(path);

/*
 *  Make file name is unique
 */
export const uniquifyFileName = (path: string): string => {
  const uniqueHash = uuid();
  const splittedFileName = path.split('.');
  if (splittedFileName.length > 1) {
    const fileExtension = splittedFileName.pop();
    const fullFileName = splittedFileName.join('.');
    return `${fullFileName}-${uniqueHash}.${fileExtension}`;
  }
  return `${path}-${uniqueHash}`;
};

export const isFileNameContainUuid = (fileName: string): boolean => {
  const splittedFileName = fileName.split('/');
  const onlyFileName = splittedFileName.pop();
  return /.*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*/.test(onlyFileName);
};

export const isOrgFile = (fileName: string): boolean => /\.org$/.test(fileName);
