import { Ref } from 'vue';
import {
  Command,
  CommandCallback,
  CommandHandlerParams,
  CommandName,
} from './command';
import { StoreDefinition } from './store';
import type { OrgNoteApi } from 'src/api';
import type { CommandExecutionOrigin } from 'src/constants/command-execution-origin';

export type CommandUnsubscribFn = () => void;

export interface ExecuteCommandOptions {
  interactive?: boolean;
  origin?: CommandExecutionOrigin;
}

export interface CommandWrapperContext<TData = unknown, TResult = unknown> {
  api: OrgNoteApi;
  command: Command<TData, TResult>;
  params: CommandHandlerParams<TData>;
  next: (params?: CommandHandlerParams<TData>) => Promise<TResult | undefined>;
}

export interface CommandWrapper<TData = unknown, TResult = unknown> {
  id: string;
  priority?: number;
  handler: (
    context: CommandWrapperContext<TData, TResult>
  ) => TResult | undefined | Promise<TResult | undefined>;
}

export interface CommandsStore {
  add: (...newCommands: Command[]) => void;
  remove: (...commandsToUnregister: Command[]) => void;
  get: (name: string) => Command | undefined;
  commands: Ref<Command[]>;
  execute: <TData = unknown, TResult = unknown>(
    name: string,
    data?: TData,
    options?: ExecuteCommandOptions
  ) => Promise<TResult | undefined>;
  wrap: <TData = unknown, TResult = unknown>(
    name: CommandName,
    wrapper: CommandWrapper<TData, TResult>
  ) => CommandUnsubscribFn;
  afterExecute: (
    commandNames: string | string[],
    callback: CommandCallback
  ) => CommandUnsubscribFn;
}

export type CommandsStoreDefinition = StoreDefinition<CommandsStore>;
