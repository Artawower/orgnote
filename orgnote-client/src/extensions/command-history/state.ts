import {
  COMMAND_PALETTE_EXECUTION_ORIGIN,
  type Command,
  type CompletionCandidate,
  type ExecuteCommandOptions,
  type OrgNoteApi,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { record, safeParse, string, type InferOutput } from 'valibot';
import { getCandidateTitle } from 'src/utils/completion-candidate-title';

const HISTORY_KEY = 'command-history';
const COMMAND_HISTORY_SCHEMA = record(string(), string());

type CommandHistory = Readonly<InferOutput<typeof COMMAND_HISTORY_SCHEMA>>;
type CommandHistoryRepository = OrgNoteApi['infrastructure']['keyValueRepository'];
type CommandsStore = ReturnType<OrgNoteApi['core']['useCommands']>;
type RecordCommandUsage = (commandName: string) => Promise<void>;
type HistoryCacheState = { current: CommandHistory };
type SerializedWriterState = { pending: Promise<void> };

export type CommandHistoryState = Readonly<{
  syncCommands: (commands: Command[]) => void;
  rankCandidates: (
    candidates: CompletionCandidate<Command>[],
    searchQuery: string,
  ) => CompletionCandidate<Command>[];
  dispose: () => void;
}>;

const parseHistory = (content?: string): CommandHistory => {
  if (!content) return {};
  const json = to(JSON.parse)(content);
  if (json.isErr()) return {};
  const history = safeParse(COMMAND_HISTORY_SCHEMA, json.value);
  return history.success ? history.output : {};
};

const loadHistory = async (repository: CommandHistoryRepository): Promise<CommandHistory> =>
  parseHistory(await repository.get(HISTORY_KEY));

const serializeHistory = (history: CommandHistory): string => JSON.stringify(history, null, 2);

const createSerializedHistoryWriter = (repository: CommandHistoryRepository) => {
  const state: SerializedWriterState = { pending: Promise.resolve() };

  return (history: CommandHistory): Promise<void> => {
    const persist = () => repository.set(HISTORY_KEY, serializeHistory(history));
    const pending = state.pending.then(persist, persist);
    state.pending = pending;
    return pending;
  };
};

const createHistoryCache = (
  initialHistory: CommandHistory,
  writeHistory: (history: CommandHistory) => Promise<void>,
) => {
  const state: HistoryCacheState = { current: initialHistory };

  const recordUsage = (commandName: string): Promise<void> => {
    const history = { ...state.current, [commandName]: new Date().toISOString() };
    state.current = history;
    return writeHistory(history);
  };

  return { getCurrent: () => state.current, recordUsage };
};

const shouldRecordExecution = (options?: ExecuteCommandOptions): boolean =>
  Boolean(options?.interactive && options.origin === COMMAND_PALETTE_EXECUTION_ORIGIN);

const getCommandNames = (commands: Command[]): string[] =>
  commands.map((command) => command.command).filter((name): name is string => Boolean(name));

const createRegistrationState = () => {
  const registered = new Map<string, () => void>();

  const unregisterMissing = (nextNames: Set<string>): void => {
    [...registered.entries()]
      .filter(([name]) => !nextNames.has(name))
      .forEach(([name, unregister]) => {
        unregister();
        registered.delete(name);
      });
  };

  const dispose = (): void => {
    registered.forEach((unregister) => unregister());
    registered.clear();
  };

  return {
    has: (name: string) => registered.has(name),
    add: (name: string, unregister: () => void): void => {
      registered.set(name, unregister);
    },
    unregisterMissing,
    dispose,
  };
};

const createCommandSubscriptions = (
  commandsStore: CommandsStore,
  recordCommandUsage: RecordCommandUsage,
) => {
  const registrations = createRegistrationState();

  const subscribe = (name: string): void => {
    const unregister = commandsStore.afterExecute(name, async (command, _, options) => {
      if (!shouldRecordExecution(options) || !command.command) return;
      await recordCommandUsage(command.command);
    });
    registrations.add(name, unregister);
  };

  const syncCommands = (commands: Command[]): void => {
    const commandNames = getCommandNames(commands);
    registrations.unregisterMissing(new Set(commandNames));
    commandNames.filter((name) => !registrations.has(name)).forEach(subscribe);
  };

  return { syncCommands, dispose: registrations.dispose };
};

const sortCandidatesByHistory = (
  candidates: CompletionCandidate<Command>[],
  history: CommandHistory,
): CompletionCandidate<Command>[] =>
  [...candidates].sort((a, b) => {
    const aLastUsed = a.data.command ? history[a.data.command] : undefined;
    const bLastUsed = b.data.command ? history[b.data.command] : undefined;

    if (aLastUsed && bLastUsed) {
      return new Date(bLastUsed).getTime() - new Date(aLastUsed).getTime();
    }
    if (aLastUsed) return -1;
    if (bLastUsed) return 1;
    return getCandidateTitle(a).localeCompare(getCandidateTitle(b));
  });

const rankCandidates = (
  candidates: CompletionCandidate<Command>[],
  searchQuery: string,
  history: CommandHistory,
): CompletionCandidate<Command>[] =>
  searchQuery.trim() ? candidates : sortCandidatesByHistory(candidates, history);

export const createCommandHistoryState = async (api: OrgNoteApi): Promise<CommandHistoryState> => {
  const repository = api.infrastructure.keyValueRepository;
  const cache = createHistoryCache(
    await loadHistory(repository),
    createSerializedHistoryWriter(repository),
  );
  const subscriptions = createCommandSubscriptions(api.core.useCommands(), cache.recordUsage);

  return {
    syncCommands: subscriptions.syncCommands,
    rankCandidates: (candidates, searchQuery) =>
      rankCandidates(candidates, searchQuery, cache.getCurrent()),
    dispose: subscriptions.dispose,
  };
};
