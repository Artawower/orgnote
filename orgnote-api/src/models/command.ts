import { MaybeRefOrGetter } from 'vue';
import { COMMAND_GROUPS } from 'src/constants';
import { DefaultCommands } from './default-commands';
import { OrgNoteApi } from 'src/api';
import { VueComponent } from './vue-component';
import type { ExecuteCommandOptions } from './commands-store';
import type { Hotkey, KeybindingContextId } from './keybinding';

export type CommandGroup =
  | (typeof COMMAND_GROUPS)[number]
  | (string & Record<never, never>);

export type CommandName = DefaultCommands | (string & {});

export type CommandIcon = string | VueComponent;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CommandHandlerParams<T = any> {
  event?: KeyboardEvent;
  data?: T;
  meta: CommandMeta<T>;
  [key: string]: unknown;
}

export interface CommandPreview {
  description?: MaybeRefOrGetter<string | undefined>;
  command?: CommandName;
  title?: MaybeRefOrGetter<string | undefined>;
  icon?: MaybeRefOrGetter<CommandIcon | undefined>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CommandMeta<T = any> extends Partial<CommandPreview> {
  group?: CommandGroup;
  defaultHotkeys?: Hotkey[];
  /* defaults to 'global'; 'editor' context commands are projected into CodeMirror keymap */
  keybindingContext?: KeybindingContextId;
  /* shown in Keybindings settings UI and assignable by users */
  interactive?: boolean;
  system?: boolean;
  hide?: (api: OrgNoteApi) => boolean;
  disabled?: (api: OrgNoteApi) => boolean;
  isActive?: (api: OrgNoteApi) => boolean;
  context?: {
    [key: string]: T;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Command<T = any, R = unknown> extends CommandMeta<T> {
  /* arguments depend on the current scope */
  handler: (api: OrgNoteApi, params: CommandHandlerParams<T>) => R | Promise<R>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandCallback = <T = any>(
  meta: Command,
  data: T,
  options?: ExecuteCommandOptions
) => void;
