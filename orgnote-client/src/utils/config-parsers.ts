import { parseToml } from 'orgnote-api/utils';

type ConfigParser = (content: string) => unknown;

const CONFIG_PARSERS: Record<string, ConfigParser> = {
  '.toml': parseToml,
  '.json': JSON.parse,
};

export const SUPPORTED_CONFIG_EXTENSIONS = Object.keys(CONFIG_PARSERS);

export const getFileExtension = (filePath: string): string => {
  const lastDot = filePath.lastIndexOf('.');
  return lastDot === -1 ? '' : filePath.slice(lastDot).toLowerCase();
};

export const parseConfig = <T>(content: string, filePath: string): T => {
  const extension = getFileExtension(filePath);
  const parser = CONFIG_PARSERS[extension];

  if (!parser) {
    throw new Error(`Unsupported config format: ${extension}`);
  }

  return parser(content) as T;
};

export const isSupportedConfigFile = (filePath: string): boolean => {
  const extension = getFileExtension(filePath);
  return extension in CONFIG_PARSERS;
};
