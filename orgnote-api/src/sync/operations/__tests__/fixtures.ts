import type { FileSystem } from '../../../models/file-system';
import { createMemorySyncState } from '../../memory-state';
import type { SyncContext, SyncExecutor } from '../../types';

export const SHA256_OF_ABC =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

interface CreateContextParams {
  fs: FileSystem;
  executor: SyncExecutor;
  deviceName?: string;
}

export const createContext = ({
  fs,
  executor,
  deviceName,
}: CreateContextParams): SyncContext => ({
  fs,
  executor,
  state: createMemorySyncState(),
  serverTime: '2024-01-01T00:00:00Z',
  deviceName,
});
