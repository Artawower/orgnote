import type { SyncState, SyncStatus } from './types';

const isInterruptedStatus = (status: SyncStatus): boolean =>
  status === 'uploading' || status === 'downloading';

export const recoverState = async (state: SyncState): Promise<void> => {
  const data = await state.get();

  const interruptedFiles = Object.entries(data.files).filter(([, file]) =>
    isInterruptedStatus(file.status)
  );

  await Promise.all(
    interruptedFiles.map(([path, file]) =>
      state.setFile(path, { ...file, status: 'dirty' })
    )
  );
};
