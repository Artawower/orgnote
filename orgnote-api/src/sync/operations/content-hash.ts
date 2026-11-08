import { ErrorFileNotFound, type FileSystem } from '../../models/file-system';
import { hashContent } from '../utils/content-hash';

export const resolveContentHash = async (
  fs: FileSystem,
  path: string,
  preferredHash?: string
): Promise<string | undefined> => {
  if (preferredHash !== undefined) {
    return preferredHash;
  }

  try {
    const content = await fs.readFile(path, 'binary');
    return hashContent(content);
  } catch (error) {
    if (error instanceof ErrorFileNotFound) {
      return undefined;
    }

    throw error;
  }
};
