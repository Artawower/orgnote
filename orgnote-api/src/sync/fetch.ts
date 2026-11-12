import type { FileChange, SyncChangesResponse } from '../remote-api';
import type { SyncApi, RemoteFile } from './types';
import { getHttpHeader, isRecord } from './utils/http-headers';
import {
  InvalidSyncResponseError,
  type InvalidSyncResponseDetails,
} from './invalid-response-error';

const DEFAULT_LIMIT = 100;
const SYNC_CHANGES_OPERATION = 'syncChangesGet';

type ServerFields = Pick<SyncChangesResponse, 'serverTime' | 'cursor'>;

export interface FetchResult extends ServerFields {
  files: RemoteFile[];
}

export type InvalidSyncChangesResponseReason =
  | 'missing_data'
  | 'missing_changes'
  | 'invalid_server_time'
  | 'invalid_has_more'
  | 'missing_cursor'
  | 'invalid_response_shape';

export interface InvalidSyncChangesResponseDetails extends InvalidSyncResponseDetails {
  operation: typeof SYNC_CHANGES_OPERATION;
  reason: InvalidSyncChangesResponseReason;
  topLevelKeys: string[];
  dataKeys: string[];
}

export class InvalidSyncChangesResponseError extends InvalidSyncResponseError<InvalidSyncChangesResponseDetails> {
  constructor(details: InvalidSyncChangesResponseDetails) {
    super(
      'Invalid sync changes response. Check the configured API URL.',
      'InvalidSyncChangesResponseError',
      details,
    );
  }
}

export const fetchRemoteChanges = async (
  api: SyncApi,
  since?: string
): Promise<FetchResult> => fetchAllPages(api, since);

const fetchAllPages = async (
  api: SyncApi,
  since?: string,
  cursor?: string,
  accumulated: RemoteFile[] = []
): Promise<FetchResult> => {
  const page = await fetchPage(api, since, cursor);
  const files = [...accumulated, ...page.files];

  if (!page.cursor) {
    return { files, serverTime: page.serverTime };
  }

  return fetchAllPages(api, since, page.cursor, files);
};

const toTimestamp = (isoString?: string): number | undefined => {
  if (!isoString) return undefined;
  return new Date(isoString).getTime();
};

const fetchPage = async (
  api: SyncApi,
  since?: string,
  cursor?: string
): Promise<FetchResult> => {
  const sinceMs = toTimestamp(since);
  const response = await api.syncChangesGet(sinceMs, DEFAULT_LIMIT, cursor);
  const data = getSyncChangesData(response.data);

  if (!data) {
    throw new InvalidSyncChangesResponseError(createInvalidResponseDetails(response));
  }

  return {
    files: mapChangesToFiles(data.changes),
    serverTime: data.serverTime,
    cursor: data.hasMore ? data.cursor : undefined,
  };
};

const getDataField = (body: unknown): unknown => (isRecord(body) ? body.data : undefined);

const getKeys = (value: unknown): string[] => (isRecord(value) ? Object.keys(value) : []);

const getSyncChangesData = (body: unknown): SyncChangesResponse | null => {
  if (getInvalidSyncChangesReason(body)) return null;
  return getDataField(body) as SyncChangesResponse;
};

const getInvalidSyncChangesReason = (
  body: unknown,
): InvalidSyncChangesResponseReason | undefined => {
  const data = getDataField(body);
  if (!isRecord(data)) return 'missing_data';
  if (!Array.isArray(data.changes)) return 'missing_changes';
  if (typeof data.serverTime !== 'string') return 'invalid_server_time';
  if (typeof data.hasMore !== 'boolean') return 'invalid_has_more';
  if (data.hasMore && typeof data.cursor !== 'string') return 'missing_cursor';
  return undefined;
};

const getResponseKind = (body: unknown): string => {
  if (typeof body === 'string') {
    return body.trimStart().startsWith('<') ? 'html' : 'text';
  }
  if (Array.isArray(body)) return 'array';
  if (isRecord(body)) return 'json-object';
  return typeof body;
};

const createInvalidResponseDetails = (response: unknown): InvalidSyncChangesResponseDetails => {
  const body = isRecord(response) ? response.data : undefined;
  return {
    operation: SYNC_CHANGES_OPERATION,
    reason: getInvalidSyncChangesReason(body) ?? 'invalid_response_shape',
    responseKind: getResponseKind(body),
    status: getResponseStatus(response),
    contentType: getContentType(response),
    topLevelKeys: getKeys(body),
    dataKeys: getKeys(getDataField(body)),
  };
};

const getResponseStatus = (response: unknown): number | undefined => {
  if (!isRecord(response)) return undefined;
  return typeof response.status === 'number' ? response.status : undefined;
};

const getContentType = (response: unknown): string | undefined => {
  if (!isRecord(response)) return undefined;
  return getHttpHeader(response.headers, 'content-type');
};

const mapChangesToFiles = (changes: FileChange[]): RemoteFile[] =>
  changes.map(toRemoteFile);

const toRemoteFile = (change: FileChange): RemoteFile => ({
  path: change.path,
  version: change.version,
  deleted: change.deleted,
  updatedAt: change.updatedAt,
  contentHash: change.contentHash,
});
