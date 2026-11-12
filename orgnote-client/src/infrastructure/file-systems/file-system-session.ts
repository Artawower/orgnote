import type { FileSystem, FileSystemSession } from 'orgnote-api';
import { isPresent } from 'orgnote-api/utils';
import { type ShallowRef, shallowRef } from 'vue';

export interface FileSystemSessionState {
  readonly currentSession: ShallowRef<FileSystemSession | null>;
  publishIfChanged: (fs: FileSystem, fsName: string, root?: string) => FileSystemSession;
  clear: () => void;
  isActive: (session: FileSystemSession) => boolean;
}

export const createFileSystemSessionState = (): FileSystemSessionState => {
  let sessionSequence = 0;
  const currentSession = shallowRef<FileSystemSession | null>(null);

  const findMatchingActiveSession = (
    fs: FileSystem,
    fsName: string,
    root?: string,
  ): FileSystemSession | undefined => {
    const session = currentSession.value;
    if (!session) return undefined;
    if (session.fs === fs && session.fsName === fsName && session.root === root) {
      return session;
    }
    return undefined;
  };

  const publishIfChanged = (
    fs: FileSystem,
    fsName: string,
    root?: string,
  ): FileSystemSession => {
    const existing = findMatchingActiveSession(fs, fsName, root);
    if (existing) return existing;
    sessionSequence += 1;
    const session: FileSystemSession = {
      id: sessionSequence,
      fs,
      fsName,
      root,
      storageKey: `${fsName}:${root ?? ''}`,
    };
    currentSession.value = session;
    return session;
  };

  const clear = (): void => {
    currentSession.value = null;
  };

  const isActive = (session: FileSystemSession): boolean =>
    isPresent(currentSession.value) && currentSession.value.id === session.id;

  return {
    currentSession,
    publishIfChanged,
    clear,
    isActive,
  };
};
