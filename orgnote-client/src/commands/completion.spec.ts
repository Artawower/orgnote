import { test, expect, vi } from 'vitest';
import {
  COMMAND_PALETTE_EXECUTION_ORIGIN,
  DefaultCommands,
  KEYBINDING_CONTEXTS,
  type OrgNoteApi,
} from 'orgnote-api';
import { getCompletionCommands } from './completion';

const selectCommand = vi.hoisted(() => vi.fn());

vi.mock('src/utils/select-command', () => ({ selectCommand }));

const createApi = (canAcceptAutocomplete: boolean): OrgNoteApi =>
  ({
    core: {
      useCompletion: () => ({
        canAcceptAutocomplete: vi.fn(() => canAcceptAutocomplete),
        acceptAutocomplete: vi.fn(),
        nextCandidate: vi.fn(),
        previousCandidate: vi.fn(),
      }),
      useCommands: () => ({
        execute: vi.fn(),
      }),
    },
  }) as unknown as OrgNoteApi;

const getCommand = (commandName: DefaultCommands) => {
  const command = getCompletionCommands().find((command) => command.command === commandName);
  if (!command) throw new Error(`Expected ${commandName} command`);
  return command;
};

const getAutocompleteCommand = () => getCommand(DefaultCommands.ACCEPT_COMPLETION_AUTOCOMPLETE);

test('getCompletionCommands registers command palette shortcuts in shell context', () => {
  const command = getCommand(DefaultCommands.TOGGLE_COMMANDS);

  expect(command.defaultHotkeys).toEqual([
    { key: 'p', modifiers: ['Mod'] },
    { key: 'p', modifiers: ['Mod', 'Shift'] },
  ]);
  expect(command.keybindingContext).toBe(KEYBINDING_CONTEXTS.SHELL);
  expect(command.interactive).toBe(true);
});

test('getCompletionCommands hides command palette opener from command candidates', () => {
  const command = getCommand(DefaultCommands.TOGGLE_COMMANDS);

  expect(command.system).toBe(true);
});

test('getCompletionCommands marks selected commands with command palette origin', async () => {
  const execute = vi.fn();
  const api = {
    core: {
      useCommands: () => ({ execute }),
    },
  } as unknown as OrgNoteApi;
  const command = getCommand(DefaultCommands.TOGGLE_COMMANDS);
  selectCommand.mockResolvedValueOnce({ command: 'selected-command', handler: vi.fn() });

  await command.handler(api, { meta: command });

  expect(execute).toHaveBeenCalledWith('selected-command', undefined, {
    interactive: true,
    origin: COMMAND_PALETTE_EXECUTION_ORIGIN,
  });
});

test('getCompletionCommands registers autocomplete command on Tab in completion context', () => {
  const command = getAutocompleteCommand();

  expect(command.defaultHotkeys).toEqual([{ key: 'Tab' }]);
  expect(command.keybindingContext).toBe(KEYBINDING_CONTEXTS.COMPLETION);
  expect(command.system).toBe(true);
});

test('getCompletionCommands disables autocomplete command when input-choice cannot accept', () => {
  const command = getAutocompleteCommand();
  const api = createApi(false);

  expect(command.disabled?.(api)).toBe(true);
});

test('getCompletionCommands enables autocomplete command when input-choice can accept', () => {
  const command = getAutocompleteCommand();
  const api = createApi(true);

  expect(command.disabled?.(api)).toBe(false);
});

test('getCompletionCommands autocomplete command calls completion store', () => {
  const command = getAutocompleteCommand();
  const acceptAutocomplete = vi.fn();
  const api = {
    core: {
      useCompletion: () => ({
        canAcceptAutocomplete: vi.fn(() => true),
        acceptAutocomplete,
      }),
    },
  } as unknown as OrgNoteApi;

  command.handler(api, { meta: command });

  expect(acceptAutocomplete).toHaveBeenCalledOnce();
});
