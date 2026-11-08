import { type OrgNoteApi, type Command, type CompletionCandidate, I18N } from 'orgnote-api';
import Fuse from 'fuse.js';
import { toValue } from 'vue';
import { getCandidateTitle } from './completion-candidate-title';

const getValueByPath = (obj: CompletionCandidate<Command>, path: string | string[]): string => {
  const key = Array.isArray(path) ? path[0] : path;

  type DynamicField = Pick<
    CompletionCandidate<Command>,
    'title' | 'description' | 'icon' | 'group'
  >;
  type DynamicKey = keyof DynamicField;

  const isDynamicKey = (k: string): k is DynamicKey =>
    ['title', 'description', 'icon', 'group'].includes(k);

  if (key && isDynamicKey(key)) {
    const value = toValue(obj[key]);
    return typeof value === 'string' ? value : '';
  }

  return Fuse.config.getFn(obj, path) as string;
};

const isCommandVisible = (command: Command, api: OrgNoteApi): boolean => {
  if (command.system) {
    return false;
  }
  if (!command.hide) {
    return true;
  }
  return !command.hide(api);
};

const commandToCandidate = (command: Command, api: OrgNoteApi): CompletionCandidate<Command> => ({
  data: command,
  group: command.group,
  icon: command.icon,
  title: command.title ?? command.command,
  description: command.description,
  commandHandler: (cmd) => {
    api.core.useCompletion().close(cmd);
  },
});

const sortCandidatesAlphabetically = (
  candidates: CompletionCandidate<Command>[],
): CompletionCandidate<Command>[] => {
  return [...candidates].sort((a, b) => getCandidateTitle(a).localeCompare(getCandidateTitle(b)));
};

export async function selectCommand(
  api: OrgNoteApi,
  placeholder?: string,
): Promise<Command | undefined> {
  const commands = api.core.useCommands().commands;
  const threshold = api.core.useConfig().config.completion.fuseThreshold;

  const visibleCommands = commands.filter((c) => isCommandVisible(c, api));
  const candidates = visibleCommands.map((c) => commandToCandidate(c, api));
  const sortedCandidates = sortCandidatesAlphabetically(candidates);

  const fuse = new Fuse(sortedCandidates, {
    threshold,
    keys: ['title', 'description', 'group', 'data.command'],
    getFn: getValueByPath,
  });

  const selected = await api.core.useCompletion().open<Command, Command>({
    name: 'commands',
    itemsGetter: (query) => {
      const res = query ? fuse.search(query).map((r) => r.item) : sortedCandidates;
      return {
        result: res,
        total: res.length,
      };
    },
    placeholder: placeholder ?? I18N.SELECT_COMMAND,
    type: 'choice',
  });

  return selected;
}
