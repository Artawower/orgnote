import {
  integer,
  maxValue,
  minValue,
  number,
  object,
  optional,
  pipe,
  safeParse,
  unknown,
} from 'valibot';
import type { RemoteFile } from './types';
import { hashBytes } from './utils/content-hash';
import { getHttpHeader, isRecord } from './utils/http-headers';
import {
  InvalidSyncResponseError,
  type InvalidSyncResponseDetails,
} from './invalid-response-error';

const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;
const CONTENT_HASH_HEADER = 'x-content-hash';
const CONTENT_TYPE_HEADER = 'content-type';
const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/i;
const SYNC_FILE_OPERATION = 'syncFilesGet';

const syncFileResponseSchema = object({
  data: unknown(),
  status: pipe(
    number(),
    integer(),
    minValue(HTTP_OK_MIN),
    maxValue(HTTP_OK_MAX)
  ),
  headers: optional(unknown()),
});

export type InvalidSyncFileResponseReason =
  | 'invalid_response'
  | 'invalid_data'
  | 'missing_content_hash'
  | 'invalid_content_hash'
  | 'content_hash_mismatch';

export interface InvalidSyncFileResponseDetails extends InvalidSyncResponseDetails {
  operation: typeof SYNC_FILE_OPERATION;
  path: string;
  reason: InvalidSyncFileResponseReason;
  expectedHash?: string;
  actualHash?: string;
}

export class InvalidSyncFileResponseError extends InvalidSyncResponseError<InvalidSyncFileResponseDetails> {
  constructor(details: InvalidSyncFileResponseDetails) {
    super(
      'Invalid sync file response. The local file was not modified.',
      'InvalidSyncFileResponseError',
      details
    );
  }
}

const getResponseKind = (data: unknown): string => {
  if (typeof data === 'string') return 'text';
  if (data instanceof ArrayBuffer) return 'array-buffer';
  if (ArrayBuffer.isView(data)) return 'typed-array';
  if (Array.isArray(data)) return 'array';
  return data === null ? 'null' : typeof data;
};

const toBytes = (data: unknown): Uint8Array | null => {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (!ArrayBuffer.isView(data)) return null;
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
};

type RemoteContentIdentity = Pick<RemoteFile, 'path' | 'contentHash'>;

const createError = (
  file: RemoteContentIdentity,
  reason: InvalidSyncFileResponseReason,
  response: unknown,
  additions: Partial<InvalidSyncFileResponseDetails> = {}
): InvalidSyncFileResponseError => {
  const parsed = safeParse(syncFileResponseSchema, response);
  const data = parsed.success
    ? parsed.output.data
    : isRecord(response)
      ? response.data
      : undefined;
  const status = parsed.success
    ? parsed.output.status
    : isRecord(response)
      ? response.status
      : undefined;
  const headers = parsed.success
    ? parsed.output.headers
    : isRecord(response)
      ? response.headers
      : undefined;
  return new InvalidSyncFileResponseError({
    operation: SYNC_FILE_OPERATION,
    path: file.path,
    reason,
    responseKind: getResponseKind(data),
    status: typeof status === 'number' ? status : undefined,
    contentType: getHttpHeader(headers, CONTENT_TYPE_HEADER),
    ...additions,
  });
};

const parseResponseContentHash = (
  file: RemoteContentIdentity,
  response: unknown,
  headers: unknown
): string => {
  const contentHash = getHttpHeader(headers, CONTENT_HASH_HEADER);
  if (!contentHash) throw createError(file, 'missing_content_hash', response);

  const normalizedHash = contentHash.trim().toLowerCase();
  if (SHA_256_HEX_PATTERN.test(normalizedHash)) return normalizedHash;
  throw createError(file, 'invalid_content_hash', response, {
    actualHash: contentHash,
  });
};

const assertBodyContentHash = async (
  file: RemoteContentIdentity,
  response: unknown,
  content: Uint8Array,
  responseHash: string
): Promise<void> => {
  const actualHash = await hashBytes(content);
  if (actualHash.toLowerCase() === responseHash) return;
  throw createError(file, 'content_hash_mismatch', response, {
    expectedHash: responseHash,
    actualHash,
  });
};

export const validateSyncFileResponse = async (
  response: unknown,
  file: RemoteContentIdentity
): Promise<Uint8Array> => {
  const parsed = safeParse(syncFileResponseSchema, response);
  if (!parsed.success) throw createError(file, 'invalid_response', response);

  const content = toBytes(parsed.output.data);
  if (!content) throw createError(file, 'invalid_data', response);

  const responseHash = parseResponseContentHash(
    file,
    response,
    parsed.output.headers
  );
  await assertBodyContentHash(file, response, content, responseHash);
  return content;
};
