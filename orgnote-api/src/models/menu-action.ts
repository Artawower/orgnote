import { CommandName } from './command';

type DefinedMenuGroup = 'file' | 'dir' | 'tab';

export type MenuGroup = DefinedMenuGroup | (string & {});

export interface MenuActionBase {
  icon?: string;
  title?: string;
}

export interface ManualMenuAction<T = unknown> extends MenuActionBase {
  handler: (data: T) => void;
}

export interface CommandMenuAction extends MenuActionBase {
  command: CommandName;
}

export type MenuAction = ManualMenuAction | CommandMenuAction;

export interface MenuGroupParams {
  items: MenuAction[];
}
