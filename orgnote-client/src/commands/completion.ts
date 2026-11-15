import {
  COMMAND_PALETTE_EXECUTION_ORIGIN,
  DefaultCommands,
  I18N,
  KEYBINDING_CONTEXTS,
  type Command,
  type OrgNoteApi,
} from 'orgnote-api';
import { selectCommand } from 'src/utils/select-command';

const toggleCommandsHandler = async (api: OrgNoteApi) => {
  const command = await selectCommand(api, I18N.EXECUTE_COMMAND);
  if (command && command.command) {
    await api.core.useCommands().execute(command.command, undefined, {
      interactive: true,
      origin: COMMAND_PALETTE_EXECUTION_ORIGIN,
    });
  }
};

export function getCompletionCommands(): Command[] {
  const commands: Command[] = [
    {
      command: DefaultCommands.TOGGLE_COMMANDS,
      icon: 'terminal',
      description: 'toggle commands',
      group: 'completion',
      interactive: true,
      system: true,
      defaultHotkeys: [
        { key: 'p', modifiers: ['Mod'] },
        { key: 'p', modifiers: ['Mod', 'Shift'] },
      ],
      keybindingContext: KEYBINDING_CONTEXTS.SHELL,
      handler: toggleCommandsHandler,
    },
    {
      command: DefaultCommands.NEXT_CANDIDATE,
      icon: 'keyboard_arrow_down',
      group: 'completion',
      system: true,
      interactive: true,
      defaultHotkeys: [{ key: 'ArrowDown' }, { key: 'n', modifiers: ['Ctrl'] }],
      keybindingContext: KEYBINDING_CONTEXTS.COMPLETION,
      handler: (api: OrgNoteApi) => {
        api.core.useCompletion().nextCandidate();
      },
    },
    {
      command: DefaultCommands.PREV_CANDIDATE,
      icon: 'keyboard_arrow_up',
      group: 'completion',
      system: true,
      interactive: true,
      defaultHotkeys: [{ key: 'ArrowUp' }, { key: 'p', modifiers: ['Ctrl'] }],
      keybindingContext: KEYBINDING_CONTEXTS.COMPLETION,
      handler: (api: OrgNoteApi) => {
        api.core.useCompletion().previousCandidate();
      },
    },
    {
      command: DefaultCommands.ACCEPT_COMPLETION_AUTOCOMPLETE,
      icon: 'keyboard_tab',
      group: 'completion',
      system: true,
      interactive: true,
      defaultHotkeys: [{ key: 'Tab' }],
      keybindingContext: KEYBINDING_CONTEXTS.COMPLETION,
      disabled: (api: OrgNoteApi) => !api.core.useCompletion().canAcceptAutocomplete(),
      handler: (api: OrgNoteApi) => {
        api.core.useCompletion().acceptAutocomplete();
      },
    },
  ];

  return commands;
}
