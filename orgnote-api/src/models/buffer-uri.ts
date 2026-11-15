export type BuiltinBufferScheme = 'file' | 'memory' | 'shared' | 'remote' | 'embedded' | 'builtin';
export type BufferScheme = BuiltinBufferScheme | (string & {});

export interface BufferUri {
  scheme: BufferScheme;
  path: string;
  raw: string;
}

const DEFAULT_SCHEME: BufferScheme = 'file';
const SCHEME_SEPARATOR = '://';

export const parseBufferUri = (uri: string): BufferUri => {
  const separatorIndex = uri.indexOf(SCHEME_SEPARATOR);

  if (separatorIndex === -1) {
    return {
      scheme: DEFAULT_SCHEME,
      path: uri,
      raw: `${DEFAULT_SCHEME}${SCHEME_SEPARATOR}${uri}`,
    };
  }

  return {
    scheme: uri.slice(0, separatorIndex) as BufferScheme,
    path: uri.slice(separatorIndex + SCHEME_SEPARATOR.length),
    raw: uri,
  };
};

export const buildBufferUri = (scheme: BufferScheme, path: string): string =>
  `${scheme}${SCHEME_SEPARATOR}${path}`;
