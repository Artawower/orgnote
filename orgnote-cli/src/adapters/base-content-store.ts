import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import type { BaseContentEntry, BaseContentStore } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { getBaseContentDir } from '../tools/paths.js';

const ENCODING = 'utf-8' as const;
const CONTENT_DIR = 'content';
const CONTENT_EXT = '.bin';
const METADATA_DIR = 'metadata';
const METADATA_EXT = '.json';

type BufferContent = {
  type: 'Buffer';
  data: number[];
};

type BaseContentMetadata = Omit<BaseContentEntry, 'content'>;
type LegacyBaseContentEntry = Omit<BaseContentEntry, 'content'> & {
  content: unknown;
};

const toEntryName = (filePath: string): string =>
  Buffer.from(filePath).toString('base64url');

const isNotFound = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException).code === 'ENOENT';

const isBufferContent = (content: unknown): content is BufferContent => {
  if (!content || typeof content !== 'object') return false;
  return 'type' in content && 'data' in content && content.type === 'Buffer';
};

const toContentBytes = (content: unknown): number[] => {
  if (Array.isArray(content)) return content;
  if (isBufferContent(content)) return content.data;
  return Object.values(content as Record<string, number>);
};

const deserializeLegacyEntry = (
  raw: LegacyBaseContentEntry
): BaseContentEntry => ({
  ...raw,
  content: new Uint8Array(toContentBytes(raw.content)),
});

const ensureDir = (filePath: string): void => {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const readJsonFile = <T>(filePath: string): T | null => {
  const result = to(() => JSON.parse(readFileSync(filePath, ENCODING)))();

  if (result.isOk()) return result.value as T;
  if (isNotFound(result.error)) return null;
  throw result.error;
};

const readLegacyEntry = (filePath: string): BaseContentEntry | null => {
  const raw = readJsonFile<LegacyBaseContentEntry>(filePath);
  if (!raw) return null;
  return deserializeLegacyEntry(raw);
};

const removeFile = (filePath: string): void => {
  if (existsSync(filePath)) unlinkSync(filePath);
};

const createPaths = (storeDir: string, path: string) => {
  const entryName = toEntryName(path);

  return {
    content: join(storeDir, CONTENT_DIR, `${entryName}${CONTENT_EXT}`),
    legacy: join(storeDir, `${entryName}${METADATA_EXT}`),
    metadata: join(storeDir, METADATA_DIR, `${entryName}${METADATA_EXT}`),
  };
};

export const createFileBaseContentStore = (
  accountName: string
): BaseContentStore => {
  const storeDir = getBaseContentDir(accountName);

  const get = async (path: string): Promise<BaseContentEntry | null> => {
    const paths = createPaths(storeDir, path);
    const metadata = readJsonFile<BaseContentMetadata>(paths.metadata);

    if (!metadata) return readLegacyEntry(paths.legacy);

    return {
      ...metadata,
      content: readFileSync(paths.content),
    };
  };

  const set = async (path: string, entry: BaseContentEntry): Promise<void> => {
    const paths = createPaths(storeDir, path);
    ensureDir(paths.content);
    ensureDir(paths.metadata);
    writeFileSync(paths.content, entry.content);
    writeFileSync(
      paths.metadata,
      JSON.stringify({ ...entry, content: undefined }, null, 2),
      ENCODING
    );
    removeFile(paths.legacy);
  };

  const remove = async (path: string): Promise<void> => {
    const paths = createPaths(storeDir, path);
    removeFile(paths.content);
    removeFile(paths.metadata);
    removeFile(paths.legacy);
  };

  return { get, set, remove };
};
