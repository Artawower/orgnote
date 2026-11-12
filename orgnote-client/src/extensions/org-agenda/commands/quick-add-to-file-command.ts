import type { Command, CommandCallback, OrgNoteApi } from 'orgnote-api';
import { object, safeParse, string, type InferOutput } from 'valibot';
import { AGENDA_QUICK_ADD_TO_FILE_COMMAND } from '../constants';

export const QUICK_ADD_TO_FILE_COMMAND_DATA_SCHEMA = object({
  filePath: string(),
});

export type QuickAddToFileCommandData = InferOutput<
  typeof QUICK_ADD_TO_FILE_COMMAND_DATA_SCHEMA
>;

type CommandsStore = ReturnType<OrgNoteApi['core']['useCommands']>;
type SelectTargetFile = (filePath: string) => void;

export const subscribeToQuickAddToFileCommand = (
  commands: CommandsStore,
  selectTargetFile: SelectTargetFile,
): (() => void) => {
  const handleExecution: CommandCallback = (_command, data) => {
    const result = safeParse(QUICK_ADD_TO_FILE_COMMAND_DATA_SCHEMA, data);
    if (!result.success) return;
    selectTargetFile(result.output.filePath);
  };

  return commands.afterExecute(AGENDA_QUICK_ADD_TO_FILE_COMMAND, handleExecution);
};

export const quickAddToFileCommand: Command<QuickAddToFileCommandData> = {
  command: AGENDA_QUICK_ADD_TO_FILE_COMMAND,
  group: 'agenda',
  icon: 'sym_o_add_task',
  system: true,
  handler: () => undefined,
};
