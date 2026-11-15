import { defineBoot } from '@quasar/app-vite/wrappers';
import { createAuthCommands } from 'src/commands/auth-commands';
import { getCompletionCommands } from 'src/commands/completion';
import { getEditorCommands } from 'src/commands/editor-commands';
import { getExtensionCommands } from 'src/commands/extension-commands';
import { getFileManagerCommands } from 'src/commands/file-manager';
import { getGlobalCommands } from 'src/commands/global-commands';
import { getNoteCommands } from 'src/commands/note-commands';
import { getTabsCommands } from 'src/commands/tabs';
import { getBufferCommands } from 'src/commands/buffer-commands';
import { getPaneCommands } from 'src/commands/pane-commands';
import { getRoutesCommands } from 'src/commands/router-commands';
import { getSettingsCommands } from 'src/commands/settings-commands';
import { getThemeCommands } from 'src/commands/theme-commands';
import { useCommandsStore } from 'src/stores/command';
import { getModalCommands } from 'src/commands/modal-commands';
import { getDeveloperCommands } from 'src/commands/developer-commands';
import { getRightSidebarCommands } from 'src/commands/right-sidebar-commands';
import { getSearchCommands } from 'src/commands/search-commands';
import { getGraphCommands } from 'src/commands/graph-commands';
import { useKeybindingsStore } from 'src/stores/keybindings';
import { getUpdateCommands } from 'src/commands/update-commands';
import { getLinkCommands } from 'src/commands/link-commands';

export default defineBoot(async ({ router }) => {
  const commandsStore = useCommandsStore();

  commandsStore.add(
    ...getRoutesCommands(router),
    ...getGlobalCommands(router),
    ...getSettingsCommands(),
    ...getThemeCommands(),
    ...getExtensionCommands(),
    ...getCompletionCommands(),
    ...getBufferCommands(),
    ...getTabsCommands(),
    ...getPaneCommands(),
    ...getFileManagerCommands(),
    ...getNoteCommands(),
    ...getModalCommands(),
    ...getDeveloperCommands(),
    ...getRightSidebarCommands(),
    ...getSearchCommands(),
    ...getEditorCommands(),
    ...createAuthCommands(router),
    ...getGraphCommands(),
    ...getUpdateCommands(),
    ...getLinkCommands(),
  );

  useKeybindingsStore();
});
