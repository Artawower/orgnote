import type { FileContent } from 'orgnote-api';
import { ErrorFileNotFound } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';

export const ensureFileExists = async (
  fileContent: FileContent,
  path: string,
): Promise<boolean> => {
  const existing = await to(fileContent.read)(path);
  if (existing.isOk()) return true;
  if (!(existing.error instanceof ErrorFileNotFound)) {
    reporter.reportError(existing.error);
    return false;
  }
  const writeResult = await to(fileContent.write)(path, new Uint8Array(0));
  if (writeResult.isErr()) {
    reporter.reportError(writeResult.error);
    return false;
  }
  return true;
};
