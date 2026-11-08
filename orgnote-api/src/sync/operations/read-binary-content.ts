import type { FileSystem } from '../../models/file-system';

export const readBinaryContent = async (
  fs: FileSystem,
  path: string
): Promise<Uint8Array> => {
  const content = await fs.readFile(path, 'binary');
  return content instanceof Uint8Array
    ? content
    : new TextEncoder().encode(String(content));
};
