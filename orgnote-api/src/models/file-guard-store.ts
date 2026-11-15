import type { Ref } from 'vue';
import type { DiskFile } from './file-system';
import type { FileGuard, ValidationError } from './file-guard';
import type { StoreDefinition } from './store';

export interface FileGuardStore {
  guards: Ref<FileGuard[]>;

  register(guard: FileGuard): void;
  unregister(id: string): void;

  getGuard(path: string, file?: DiskFile): FileGuard | undefined;
  isReadOnly(path: string, file?: DiskFile): boolean;
  getReadOnlyReason(path: string, file?: DiskFile): string | undefined;

  validate(
    path: string,
    content: string | Uint8Array,
    file?: DiskFile
  ): Promise<ValidationError[]>;
}

export type FileGuardStoreDefinition = StoreDefinition<FileGuardStore>;
