import type { LocalFile, RemoteFile, SyncOperationType } from 'orgnote-api';

export interface SyncQueueTask {
  type: SyncOperationType;
  data: LocalFile | RemoteFile | string;
  serverTime: string;
}
