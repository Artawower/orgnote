import type { Command, Extension, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands } from 'orgnote-api';

const COMMAND_NAME = DefaultCommands.OPEN_LOCAL_GRAPH;

const createCommand = (): Command => ({
  command: COMMAND_NAME,
  group: 'right sidebar',
  icon: 'sym_o_hub',
  handler: async (api: OrgNoteApi) => {
    const { default: LocalGraph } = await import('./LocalGraph.vue');
    api.ui.useRightSidebar().openComponent(LocalGraph);
  },
});

export const localGraphExtension: Extension = {
  onMounted: async (api) => {
    api.core.useCommands().add(createCommand());
    api.ui.usePinnedCommands().addCommand('right-sidebar', COMMAND_NAME);
  },
  onUnmounted: async (api) => {
    const command = api.core.useCommands().get(COMMAND_NAME);
    if (command) api.core.useCommands().remove(command);
    api.ui.usePinnedCommands().removeCommand('right-sidebar', COMMAND_NAME);
  },
};
