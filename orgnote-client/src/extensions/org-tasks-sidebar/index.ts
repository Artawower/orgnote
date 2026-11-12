import type { Command, Extension, OrgNoteApi } from 'orgnote-api';
import OrgTasksSidebar from './OrgTasksSidebar.vue';

const commandName = 'open tasks sidebar';

const createCommand = (): Command => ({
  command: commandName,
  title: 'Open tasks sidebar',
  group: 'right sidebar',
  icon: 'sym_o_checklist',
  handler: (api: OrgNoteApi) => {
    api.ui.useRightSidebar().openComponent(OrgTasksSidebar);
  },
});

export const orgTasksSidebarExtension: Extension = {
  onMounted: async (api) => {
    api.core.useCommands().add(createCommand());
    api.ui.usePinnedCommands().addCommand('right-sidebar', commandName);
  },

  onUnmounted: async (api) => {
    const command = api.core.useCommands().get(commandName);
    if (command) {
      api.core.useCommands().remove(command);
    }

    api.ui.usePinnedCommands().removeCommand('right-sidebar', commandName);
  },
};

export { orgTasksSidebarManifest } from './manifest';
