import { v4 as uuid } from 'uuid';
export const normalizeStringValue = (val) => val.toLowerCase().trim();
export const isTrue = (val) => !!['true', 'yes'].find((v) => v === normalizeStringValue(val));
export function normalizeOrgValue(val) {
    const normalizedLiteral = val.toLowerCase().trim();
    if (['true', 'false'].find((v) => v === normalizedLiteral)) {
        return JSON.parse(normalizedLiteral);
    }
    if (val && !isNaN(val)) {
        return +val;
    }
    return val;
}
export const trim = (str, ch) => {
    let start = 0, end = str.length;
    while (start < end && str[start] === ch)
        ++start;
    while (end > start && str[end - 1] === ch)
        --end;
    return start > 0 || end < str.length ? str.substring(start, end) : str;
};
export const Arrayify = () => (target) => {
    const wrapperFn = (...args) => {
        const res = target(...args);
        return [[res[0]], res[1]];
    };
    return wrapperFn;
};
export const asArray = Arrayify();
export const isFileImage = (path) => /\.(gif|svg|jpe?g|tiff?|png|webp|bmp)$/i.test(path);
export const uniquifyFileName = (path) => {
    const uniqueHash = uuid();
    const splittedFileName = path.split('.');
    if (splittedFileName.length > 1) {
        const fileExtension = splittedFileName.pop();
        const fullFileName = splittedFileName.join('.');
        return `${fullFileName}-${uniqueHash}.${fileExtension}`;
    }
    return `${path}-${uniqueHash}`;
};
export const isFileNameContainUuid = (fileName) => {
    const splittedFileName = fileName.split('/');
    const onlyFileName = splittedFileName.pop();
    return /.*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*/.test(onlyFileName);
};
export const isOrgFile = (fileName) => /\.org$/.test(fileName);
//# sourceMappingURL=tools.js.map