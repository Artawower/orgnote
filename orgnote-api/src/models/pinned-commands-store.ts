import type { Ref } from 'vue';
import type { StoreDefinition } from './store';
import type { CommandName } from './command';

export type CommandContext =
  | 'sidebar'
  | 'sidebar-footer'
  | 'right-sidebar'
  | 'edit-toolbar'
  | 'editor-actions'
  | 'file-actions'
  | 'context-menu-file'
  | 'context-menu-dir'
  | 'context-menu-org-link'
  | 'context-menu-external-link'
  | ({} & string);

export interface PinnedCommandsStore {
  getCommands: (context: CommandContext) => Ref<CommandName[]>;
  addCommand: (context: CommandContext, command: CommandName) => void;
  removeCommand: (context: CommandContext, command: CommandName) => void;
}

export type PinnedCommandsStoreDefinition =
  StoreDefinition<PinnedCommandsStore>;
