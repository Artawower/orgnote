import type {
  CommandCallback,
  CommandHandlerParams,
  CommandWrapper,
  ExecuteCommandOptions,
} from 'orgnote-api';
import { type CommandsStore, type Command } from 'orgnote-api';
import { defineStore } from 'pinia';
import { api } from 'src/boot/api';
import { clientOnly } from 'src/utils/platform-specific';
import { shallowRef, triggerRef } from 'vue';

export const useCommandsStore = defineStore<'commands', CommandsStore>('commands', () => {
  const commands = shallowRef<Command[]>([]);
  const callbacks = shallowRef<Map<string, CommandCallback[]>>(new Map());
  const wrappers = shallowRef<Map<string, CommandWrapper[]>>(new Map());

  const register = (...newCommands: Command[]) => {
    if (!newCommands.length) {
      return;
    }
    commands.value.push(...newCommands);
    triggerRef(commands);
  };

  const unregister = (...commandsToUnregister: Command[]) => {
    const unregisterCommandsNames = new Set(commandsToUnregister.map((c) => c.command));
    commands.value = commands.value.filter((c) => !unregisterCommandsNames.has(c.command));
  };

  const get = (name: string) => {
    return commands.value.find((c) => c.command === name);
  };

  const canExecuteCommand = <TData, TResult>(
    command?: Command<TData, TResult>,
  ): command is Command<TData, TResult> => Boolean(command && !command.disabled?.(api));

  const afterExecute = (
    commandNames: string | string[],
    callback: CommandCallback,
  ): (() => void) => {
    const names = Array.isArray(commandNames) ? commandNames : [commandNames];

    names.forEach((commandName) => {
      if (!callbacks.value.has(commandName)) {
        callbacks.value.set(commandName, []);
      }
      callbacks.value.get(commandName)!.push(callback);
    });

    return () => {
      names.forEach((commandName) => {
        const arr = callbacks.value.get(commandName);
        if (!arr) return;
        callbacks.value.set(
          commandName,
          arr.filter((cb) => cb !== callback),
        );
      });
    };
  };

  const sortWrappersByPriority = (items: CommandWrapper[]): CommandWrapper[] =>
    [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const getCommandWrappers = (name: string): CommandWrapper[] =>
    sortWrappersByPriority(wrappers.value.get(name) ?? []);

  const runOriginalCommand = async <TData, TResult>(
    command: Command<TData, TResult>,
    params: CommandHandlerParams<TData>,
  ): Promise<TResult | undefined> => await command.handler(api, params);

  const runCommandStep = async <TData, TResult>(
    command: Command<TData, TResult>,
    chain: CommandWrapper[],
    index: number,
    params: CommandHandlerParams<TData>,
  ): Promise<TResult | undefined> => {
    const wrapper = chain[index] as CommandWrapper<TData, TResult> | undefined;
    if (!wrapper) return await runOriginalCommand(command, params);

    return await wrapper.handler({
      api,
      command,
      params,
      next: (nextParams = params) => runCommandStep(command, chain, index + 1, nextParams),
    });
  };

  const runCommandChain = async <TData, TResult>(
    command: Command<TData, TResult>,
    params: CommandHandlerParams<TData>,
  ): Promise<TResult | undefined> =>
    await runCommandStep(command, getCommandWrappers(command.command ?? ''), 0, params);

  const execute = async <TData = unknown, TResult = unknown>(
    name: string,
    data?: TData,
    options?: ExecuteCommandOptions,
  ): Promise<TResult | undefined> => {
    const command = get(name) as Command<TData, TResult> | undefined;
    if (!canExecuteCommand(command)) {
      return;
    }

    const params = {
      meta: command,
      data,
    } as CommandHandlerParams<TData>;
    const result = await runCommandChain(command, params);

    notifyListeners(name, data, command, options);
    return result;
  };

  const wrap = <TData = unknown, TResult = unknown>(
    name: string,
    wrapper: CommandWrapper<TData, TResult>,
  ): (() => void) => {
    const current = wrappers.value.get(name) ?? [];
    const next = current.filter((item) => item.id !== wrapper.id);
    wrappers.value.set(name, [...next, wrapper as CommandWrapper]);

    return () => {
      const registered = wrappers.value.get(name) ?? [];
      wrappers.value.set(
        name,
        registered.filter((item) => item !== wrapper),
      );
    };
  };

  const notifyListeners = (
    name: string,
    data: unknown,
    command: Command,
    options?: ExecuteCommandOptions,
  ) => {
    const arr = callbacks.value.get(name);
    if (arr) {
      arr.forEach((cb) => cb(command, data, options));
    }
  };

  return {
    add: clientOnly(register),
    remove: clientOnly(unregister),
    get,
    commands,
    execute,
    wrap,
    afterExecute,
  };
});
