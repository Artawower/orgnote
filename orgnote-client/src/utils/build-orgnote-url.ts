import type { BuildOrgNoteUrl, UrlTarget } from 'orgnote-api';
import { ORGNOTE_SCHEME } from 'src/constants/orgnote-scheme';

const getBaseUrl = (target: UrlTarget): string => {
  if (target === 'native-app') {
    return ORGNOTE_SCHEME;
  }
  return window.location.origin + '/';
};

const normalizePath = (path: string): string =>
  path.startsWith('/') ? path.slice(1) : path;

const buildQueryString = (query?: Record<string, string>): string => {
  if (!query || Object.keys(query).length === 0) {
    return '';
  }
  return '?' + new URLSearchParams(query).toString();
};

export const buildOrgNoteUrl: BuildOrgNoteUrl = (path, options) => {
  const target = options?.target ?? 'web';
  const baseUrl = getBaseUrl(target);
  const normalizedPath = normalizePath(path);
  const queryString = buildQueryString(options?.query);

  return `${baseUrl}${normalizedPath}${queryString}`;
};
