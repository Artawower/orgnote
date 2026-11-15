import type { Command, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands } from 'orgnote-api';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import { computed } from 'vue';
import OrgAstDebugger from 'src/components/OrgAstDebugger.vue';

const group = 'right sidebar';

const isCommandVisible = (command: Command, api: OrgNoteApi): boolean => {
  if (command.system) {
    return false;
  }

  return !command.hide?.(api);
};

export function getRightSidebarCommands(): Command[] {
  const rightSidebar = api.ui.useRightSidebar();
  return [
    {
      command: DefaultCommands.TOGGLE_RIGHT_SIDEBAR,
      group,
      icon: computed(() =>
        rightSidebar.opened ? 'sym_o_right_panel_close' : 'sym_o_right_panel_open',
      ),
      handler: async (api: OrgNoteApi) => {
        const sidebar = api.ui.useRightSidebar();
        const { opened, component } = storeToRefs(sidebar);
        const commands = api.core.useCommands();

        if (opened.value) {
          sidebar.close();
          return;
        }

        if (component.value) {
          sidebar.open();
          commands.execute(DefaultCommands.EDITOR_HIDE_KEYBOARD);
          return;
        }

        const pinnedCommands = api.ui.usePinnedCommands().getCommands('right-sidebar');

        const firstVisibleContentCommand = pinnedCommands.value.find((cmdName) => {
          if (cmdName === DefaultCommands.TOGGLE_RIGHT_SIDEBAR) {
            return false;
          }

          const resolved = commands.get(cmdName);
          if (!resolved) {
            return false;
          }

          return isCommandVisible(resolved, api);
        });

        if (firstVisibleContentCommand) {
          await commands.execute(firstVisibleContentCommand);
          return;
        }

        sidebar.open();
      },
    },
    {
      command: DefaultCommands.OPEN_RIGHT_SIDEBAR,
      group,
      icon: 'sym_o_right_panel_open',
      handler: (api: OrgNoteApi) => {
        const sidebar = api.ui.useRightSidebar();
        sidebar.open();
      },
    },
    {
      command: DefaultCommands.CLOSE_RIGHT_SIDEBAR,
      group,
      icon: 'sym_o_right_panel_close',
      handler: (api: OrgNoteApi) => {
        const sidebar = api.ui.useRightSidebar();
        sidebar.close();
      },
    },
    {
      command: DefaultCommands.TOGGLE_AST_DEBUGGER,
      group,
      hide: (api) => !api.core.useConfig().config.developer.developerMode,
      icon: 'sym_o_code',
      handler: (api: OrgNoteApi) => {
        const sidebar = api.ui.useRightSidebar();
        sidebar.openComponent(OrgAstDebugger);
      },
    },
  ];
}
