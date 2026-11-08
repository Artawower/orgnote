import {
  DefaultCommands,
  type CommandContext,
  type CommandName,
  type PinnedCommandsStore,
} from 'orgnote-api';
import { defineStore } from 'pinia';
import { computed, ref, type Ref } from 'vue';

const DEFAULT_COMMANDS: Record<CommandContext, CommandName[]> = {
  sidebar: [
    DefaultCommands.TOGGLE_FILE_MANAGER,
    DefaultCommands.CREATE_NOTE,
    DefaultCommands.SEARCH,
    DefaultCommands.OPEN_DASHBOARD,
    DefaultCommands.SHOW_TAB_SWITCHER,
    DefaultCommands.OPEN_GRAPH,
  ],
  'sidebar-sections': ['open file manager'],
  'sidebar-essentials': [DefaultCommands.SETTINGS, DefaultCommands.TOGGLE_SIDEBAR],
  'sidebar-footer': [
    DefaultCommands.TOGGLE_COMMANDS,
    DefaultCommands.PROJECT_INFO,
    DefaultCommands.SETTINGS,
    DefaultCommands.OPEN_NOTIFICATIONS,
    DefaultCommands.TOGGLE_SIDEBAR,
  ],
  'right-header': [DefaultCommands.TOGGLE_RIGHT_SIDEBAR],
  'right-sidebar': [
    DefaultCommands.TOGGLE_RIGHT_SIDEBAR,
    DefaultCommands.OPEN_NOTIFICATIONS,
    DefaultCommands.TOGGLE_AST_DEBUGGER,
  ],
  'edit-toolbar': [
    DefaultCommands.TOGGLE_SIDEBAR,
    DefaultCommands.CREATE_NOTE,
    DefaultCommands.SEARCH,
    DefaultCommands.TOGGLE_COMMANDS,
    DefaultCommands.SHOW_TAB_SWITCHER,
  ],
  'editor-actions': [
    DefaultCommands.EDITOR_UNDO,
    DefaultCommands.EDITOR_REDO,
    DefaultCommands.EDITOR_CARET_UP,
    DefaultCommands.EDITOR_CARET_DOWN,
    DefaultCommands.EDITOR_INSERT_HEADLINE,
    DefaultCommands.EDITOR_INSERT_BOLD,
    DefaultCommands.EDITOR_INSERT_ITALIC,
    DefaultCommands.EDITOR_INSERT_STRIKETHROUGH,
    DefaultCommands.EDITOR_INSERT_INLINE_CODE,
    DefaultCommands.EDITOR_INSERT_LINK,
    DefaultCommands.EDITOR_INSERT_INTERNAL_LINK,
    DefaultCommands.EDITOR_INSERT_IMAGE,
    DefaultCommands.EDITOR_INSERT_CODE_BLOCK,
    DefaultCommands.EDITOR_INSERT_QUOTE,
    DefaultCommands.EDITOR_INSERT_LATEX,
    DefaultCommands.EDITOR_INSERT_BULLET_LIST,
    DefaultCommands.EDITOR_INSERT_NUMERIC_LIST,
    DefaultCommands.EDITOR_INSERT_CHECK_LIST,
    DefaultCommands.EDITOR_INSERT_TABLE,
    DefaultCommands.EDITOR_INSERT_HORIZONTAL_RULE,
    DefaultCommands.EDITOR_INSERT_TAG,
    DefaultCommands.EDITOR_INSERT_DATETIME,
    DefaultCommands.EDITOR_INSERT_HTML_BLOCK,
  ],
  'file-actions': [
    DefaultCommands.RENAME_FILE,
    DefaultCommands.COPY_BUFFER_CONTENT,
    DefaultCommands.CLEAR_NOTE,
    DefaultCommands.COPY_FILE,
    DefaultCommands.MOVE_FILE,
    DefaultCommands.DELETE_FILE,
    DefaultCommands.SHOW_FILE_INFO,
    DefaultCommands.REVEAL_IN_FILE_MANAGER,
  ],
  'context-menu-file': [
    DefaultCommands.CREATE_NOTE,
    DefaultCommands.RENAME_FILE,
    DefaultCommands.COPY_FILE,
    DefaultCommands.MOVE_FILE,
    DefaultCommands.DELETE_FILE,
    DefaultCommands.SELECT_FILE,
  ],
  'context-menu-dir': [
    DefaultCommands.CREATE_FOLDER,
    DefaultCommands.CREATE_NOTE,
    DefaultCommands.RENAME_FILE,
    DefaultCommands.COPY_FILE,
    DefaultCommands.MOVE_FILE,
    DefaultCommands.DELETE_FILE,
    DefaultCommands.SELECT_FILE,
  ],
  'context-menu-org-link': [
    DefaultCommands.OPEN_LINK_IN_NEW_TAB,
    DefaultCommands.OPEN_LINK_IN_ADJACENT_PANE,
    DefaultCommands.COPY_LINK,
  ],
  'context-menu-external-link': [DefaultCommands.COPY_LINK],
};

export const usePinnedCommandsStore = defineStore<'pinnedCommands', PinnedCommandsStore>(
  'pinnedCommands',
  () => {
    const commandsByContext = ref<Record<string, CommandName[]>>({ ...DEFAULT_COMMANDS });

    const getCommands = (context: CommandContext): Ref<CommandName[]> => {
      if (!commandsByContext.value[context]) {
        commandsByContext.value[context] = [];
      }
      return computed(() => commandsByContext.value[context] ?? []);
    };

    const addCommand = (context: CommandContext, command: CommandName) => {
      if (!commandsByContext.value[context]) {
        commandsByContext.value[context] = [];
      }
      const commands = commandsByContext.value[context];
      if (commands.includes(command)) {
        return;
      }
      commands.push(command);
    };

    const removeCommand = (context: CommandContext, command: CommandName) => {
      const commands = commandsByContext.value[context];
      if (!commands) {
        return;
      }
      const index = commands.indexOf(command);
      if (index === -1) {
        return;
      }
      commands.splice(index, 1);
    };

    const store: PinnedCommandsStore = {
      getCommands,
      addCommand,
      removeCommand,
    };

    return store;
  },
);
