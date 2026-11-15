import type { Command, Extension, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands } from 'orgnote-api';
import OrgToc from './OrgToc.vue';

const COMMAND_NAME = DefaultCommands.OPEN_OUTLINE;

const createCommand = (): Command => ({
  command: COMMAND_NAME,
  group: 'right sidebar',
  icon: 'sym_o_format_list_bulleted',
  handler: (api: OrgNoteApi) => {
    api.ui.useRightSidebar().openComponent(OrgToc);
  },
});

export const orgTocExtension: Extension = {
  onMounted: async (api) => {
    api.core.useCommands().add(createCommand());
    api.ui.usePinnedCommands().addCommand('right-sidebar', COMMAND_NAME);
  },

  onUnmounted: async (api) => {
    const command = api.core.useCommands().get(COMMAND_NAME);
    if (command) {
      api.core.useCommands().remove(command);
    }
    api.ui.usePinnedCommands().removeCommand('right-sidebar', COMMAND_NAME);
  },
};

export { orgTocManifest } from './manifest';
