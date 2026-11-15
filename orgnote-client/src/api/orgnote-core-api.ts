import type {
  OrgNoteCoreApi,
  OrgNoteFilePath,
  OrgNoteFileSystemApi,
  OrgNoteLoggerApi,
} from 'orgnote-api';
import { logger } from 'src/boot/logger';
import { useFileSystemStore } from 'src/stores/file-system';

const toStorePath = (path: OrgNoteFilePath): string | string[] =>
  typeof path === 'string' ? path : [...path];

const files: OrgNoteFileSystemApi = {
  readFile: async (path, encoding) =>
    await useFileSystemStore().readFile(toStorePath(path), encoding),
  writeFile: async (path, content) =>
    await useFileSystemStore().writeFile(toStorePath(path), content),
  readDir: async (path = '') => await useFileSystemStore().readDir(toStorePath(path)),
  fileInfo: async (path) => await useFileSystemStore().fileInfo(toStorePath(path)),
};

const coreLogger: OrgNoteLoggerApi = {
  info: (message, fields) => logger.info(message, fields),
  error: (message, fields) => logger.error(message, fields),
  warn: (message, fields) => logger.warn(message, fields),
  debug: (message, fields) => logger.debug(message, fields),
};

export const orgNoteCoreApi: OrgNoteCoreApi = {
  files,
  logger: coreLogger,
};
