import axios from 'axios';
import type { Result } from 'neverthrow';
import { to } from '../../utils/to-error';
import type { SyncContext } from '../types';
import { readBinaryContent } from './read-binary-content';

export const createRemoteFile = (path: string, version: number) => ({
  path,
  version,
  deleted: false,
  updatedAt: new Date().toISOString(),
});

const isAxiosNotFound = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404;

const unwrapRemoteContent = <T>(result: Result<T, Error>): T | null => {
  if (result.isOk()) return result.value;
  if (isAxiosNotFound(result.error)) return null;
  throw result.error;
};

export const downloadRemoteContent = async (
  path: string,
  version: number,
  ctx: SyncContext
): Promise<Uint8Array | null> => {
  const remoteFile = createRemoteFile(path, version);
  if (ctx.executor.fetchContent) {
    const result = await to(ctx.executor.fetchContent)(remoteFile);
    return unwrapRemoteContent(result);
  }

  const result = await to(ctx.executor.download)(remoteFile);
  const downloaded = unwrapRemoteContent(result);
  return downloaded === null ? null : readBinaryContent(ctx.fs, path);
};
