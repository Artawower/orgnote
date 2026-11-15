import type { FileMeta } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { readonly, ref } from 'vue';
import { reporter } from 'src/boot/report';

export const createTasksLoader = (
  fetchFiles: () => Promise<FileMeta[]>,
  onLoaded: (files: FileMeta[]) => void,
) => {
  const isInitialLoading = ref(false);
  let hasLoaded = false;
  let latestRequestId = 0;
  let pendingInitialLoads = 0;

  const syncInitialLoading = (): void => {
    isInitialLoading.value = !hasLoaded && pendingInitialLoads > 0;
  };

  const applyLatest = (requestId: number, files: FileMeta[]): void => {
    if (requestId !== latestRequestId) return;
    hasLoaded = true;
    onLoaded(files);
  };

  const load = async (): Promise<void> => {
    const requestId = ++latestRequestId;
    const isInitial = !hasLoaded;
    pendingInitialLoads += isInitial ? 1 : 0;
    syncInitialLoading();
    const result = await to(fetchFiles, 'Failed to load tasks')();
    pendingInitialLoads -= isInitial ? 1 : 0;
    if (result.isErr()) reporter.reportError(result.error);
    if (result.isOk()) applyLatest(requestId, result.value);
    syncInitialLoading();
  };

  return { isInitialLoading: readonly(isInitialLoading), load };
};
