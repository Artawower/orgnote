import { expectTypeOf, test } from 'vitest';
import type { ComputedRef } from 'vue';
import type { FileSystem } from './file-system';
import type {
  FileSystemManagerStore,
  FileSystemSession,
} from './file-system-manager-store';

type MountedFileSystemOperation = <T>(
  session: FileSystemSession,
  operation: (fs: FileSystem) => Promise<T>,
) => Promise<T | undefined>;

test('filesystem manager exposes mounted session state', () => {
  expectTypeOf<FileSystemManagerStore['currentSession']>().toEqualTypeOf<
    ComputedRef<FileSystemSession | null>
  >();
  expectTypeOf<FileSystemSession['fs']>().toEqualTypeOf<FileSystem>();
});

test('filesystem manager guards operations with a mounted session', () => {
  expectTypeOf<
    FileSystemManagerStore['runWithMountedFileSystem']
  >().toEqualTypeOf<MountedFileSystemOperation>();
});
