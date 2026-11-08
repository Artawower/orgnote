export interface MutationState {
  userRevision: number;
  dirtyRevision: number;
  dirtyKey: string | null;
}

export const createInitialMutationState = (): MutationState => ({
  userRevision: 0,
  dirtyRevision: 0,
  dirtyKey: null,
});

export const recordUserMutation = (state: MutationState, currentKey: string): void => {
  state.userRevision += 1;
  state.dirtyRevision = state.userRevision;
  state.dirtyKey = currentKey;
};

export const clearUserMutationIfClean = (
  state: MutationState,
  storageKey: string,
  capturedRevision: number,
): boolean => {
  if (state.dirtyKey === storageKey && state.dirtyRevision === capturedRevision) {
    state.dirtyKey = null;
    state.dirtyRevision = 0;
    return true;
  }
  return false;
};

export const discardForeignMutation = (state: MutationState, newKey: string): void => {
  if (state.dirtyKey !== newKey) {
    state.dirtyKey = null;
    state.dirtyRevision = 0;
  }
};

export const buildStorageKey = (fsName?: string, vault?: string): string =>
  `${fsName ?? ''}:${vault ?? ''}`;
