import type { Command, Extension, OrgNoteApi } from 'orgnote-api';
import { watch } from 'vue';
import { createCommandHistoryState } from './state';

const COMMANDS_COMPLETION_NAME = 'commands';

const lifecycleState: { cleanup?: () => void } = {};

const disposeCommandHistory = (): void => {
  lifecycleState.cleanup?.();
  lifecycleState.cleanup = undefined;
};

const mountCommandHistory = async (api: OrgNoteApi): Promise<() => void> => {
  const completion = api.core.useCompletion();
  const commandsStore = api.core.useCommands();
  const historyState = await createCommandHistoryState(api);
  const unregisterInterceptor = completion.registerInterceptor<Command>({
    name: 'command-history-sorter',
    target: COMMANDS_COMPLETION_NAME,
    priority: 100,
    handler: async (candidates, context) =>
      historyState.rankCandidates(candidates, context.searchQuery),
  });
  const stopCommandsWatch = watch(
    () => [...commandsStore.commands],
    (commands) => historyState.syncCommands(commands),
    { immediate: true },
  );

  return () => {
    unregisterInterceptor();
    stopCommandsWatch();
    historyState.dispose();
  };
};

export const commandHistoryExtension: Extension = {
  onMounted: async (api) => {
    disposeCommandHistory();
    lifecycleState.cleanup = await mountCommandHistory(api);
  },

  onUnmounted: disposeCommandHistory,
};

export { commandHistoryManifest } from './manifest';
