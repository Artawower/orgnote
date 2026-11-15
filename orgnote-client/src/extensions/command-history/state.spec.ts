import { expect, test, vi } from 'vitest';
import {
  COMMAND_PALETTE_EXECUTION_ORIGIN,
  type Command,
  type CompletionCandidate,
  type ExecuteCommandOptions,
  type OrgNoteApi,
} from 'orgnote-api';
import { createCommandHistoryState } from './state';

type AfterExecuteCallback = (
  command: Command,
  data: unknown,
  options?: ExecuteCommandOptions,
) => void | Promise<void>;

const PALETTE_EXECUTION = {
  interactive: true,
  origin: COMMAND_PALETTE_EXECUTION_ORIGIN,
} as const;

const createCandidate = (command: string, title: string): CompletionCandidate<Command> => ({
  data: { command, handler: vi.fn() },
  title,
  commandHandler: vi.fn(),
});

const createContext = (content = '{}') => {
  const callbacks = new Map<string, AfterExecuteCallback>();
  const unregisterByName = new Map<string, ReturnType<typeof vi.fn>>();
  const repository = {
    get: vi.fn(async () => content),
    set: vi.fn(async () => undefined),
    delete: vi.fn(),
    clear: vi.fn(),
  };
  const commandsStore = {
    commands: [] as Command[],
    afterExecute: vi.fn((name: string, callback: AfterExecuteCallback) => {
      callbacks.set(name, callback);
      const unregister = vi.fn(() => callbacks.delete(name));
      unregisterByName.set(name, unregister);
      return unregister;
    }),
  };
  const api = {
    core: { useCommands: () => commandsStore },
    infrastructure: { keyValueRepository: repository },
  } as unknown as OrgNoteApi;

  return { api, callbacks, commandsStore, repository, unregisterByName };
};

test('createCommandHistoryState sorts persisted commands by recency', async () => {
  const context = createContext(
    JSON.stringify({
      'command-a': '2025-01-01T00:00:00.000Z',
      'command-b': '2025-01-02T00:00:00.000Z',
    }),
  );
  const state = await createCommandHistoryState(context.api);

  const result = state.rankCandidates(
    [createCandidate('command-a', 'Command A'), createCandidate('command-b', 'Command B')],
    '',
  );

  expect(context.repository.get).toHaveBeenCalledWith('command-history');
  expect(result.map(({ data }) => data.command)).toEqual(['command-b', 'command-a']);
});

test('createCommandHistoryState preserves search relevance order', async () => {
  const context = createContext(
    JSON.stringify({
      'command-b': '2025-01-02T00:00:00.000Z',
    }),
  );
  const state = await createCommandHistoryState(context.api);
  const candidates = [
    createCandidate('command-a', 'Command A'),
    createCandidate('command-b', 'Command B'),
  ];

  const result = state.rankCandidates(candidates, 'command a');

  expect(result).toBe(candidates);
});

test('createCommandHistoryState sorts unused commands alphabetically', async () => {
  const context = createContext();
  const state = await createCommandHistoryState(context.api);

  const result = state.rankCandidates(
    [createCandidate('command-b', 'Command B'), createCandidate('command-a', 'Command A')],
    '',
  );

  expect(result.map(({ data }) => data.command)).toEqual(['command-a', 'command-b']);
});

test('createCommandHistoryState updates ordering before persistence completes', async () => {
  const context = createContext();
  const state = await createCommandHistoryState(context.api);
  state.syncCommands([
    { command: 'command-a', handler: vi.fn() },
    { command: 'command-b', handler: vi.fn() },
  ]);
  const candidates = [
    createCandidate('command-a', 'Command A'),
    createCandidate('command-b', 'Command B'),
  ];

  const persistence = context.callbacks.get('command-b')?.(
    candidates[1]!.data,
    undefined,
    PALETTE_EXECUTION,
  );
  const result = state.rankCandidates(candidates, '');

  expect(result[0]?.data.command).toBe('command-b');
  await persistence;
  expect(context.repository.set).toHaveBeenCalledWith(
    'command-history',
    expect.stringContaining('command-b'),
  );
});

test('createCommandHistoryState persists snapshots in update order', async () => {
  const writeResolvers: Array<() => void> = [];
  const context = createContext();
  context.repository.set = vi.fn(
    () => new Promise<void>((resolve) => writeResolvers.push(resolve)),
  );
  const state = await createCommandHistoryState(context.api);
  state.syncCommands([
    { command: 'command-a', handler: vi.fn() },
    { command: 'command-b', handler: vi.fn() },
  ]);

  const firstWrite = context.callbacks.get('command-a')?.(
    { command: 'command-a', handler: vi.fn() },
    undefined,
    PALETTE_EXECUTION,
  );
  const secondWrite = context.callbacks.get('command-b')?.(
    { command: 'command-b', handler: vi.fn() },
    undefined,
    PALETTE_EXECUTION,
  );

  await Promise.resolve();
  expect(context.repository.set).toHaveBeenCalledTimes(1);
  writeResolvers.shift()?.();
  await firstWrite;
  expect(context.repository.set).toHaveBeenCalledTimes(2);
  expect(context.repository.set).toHaveBeenLastCalledWith(
    'command-history',
    expect.stringContaining('command-b'),
  );
  writeResolvers.shift()?.();
  await secondWrite;
});

test('createCommandHistoryState ignores executions outside command palette', async () => {
  const context = createContext();
  const state = await createCommandHistoryState(context.api);
  const command = { command: 'close-modal', handler: vi.fn() };
  state.syncCommands([command]);

  await context.callbacks.get('close-modal')?.(command, undefined, { interactive: true });

  expect(context.repository.set).not.toHaveBeenCalled();
});

test('createCommandHistoryState ignores non-interactive palette executions', async () => {
  const context = createContext();
  const state = await createCommandHistoryState(context.api);
  const command = { command: 'select-theme', handler: vi.fn() };
  state.syncCommands([command]);

  await context.callbacks.get('select-theme')?.(command, undefined, {
    origin: COMMAND_PALETTE_EXECUTION_ORIGIN,
  });

  expect(context.repository.set).not.toHaveBeenCalled();
});

test('createCommandHistoryState reconciles command subscriptions', async () => {
  const context = createContext();
  const state = await createCommandHistoryState(context.api);
  const commandA = { command: 'command-a', handler: vi.fn() };
  const commandB = { command: 'command-b', handler: vi.fn() };

  state.syncCommands([commandA]);
  state.syncCommands([commandB]);

  expect(context.unregisterByName.get('command-a')).toHaveBeenCalledOnce();
  expect(context.callbacks.has('command-a')).toBe(false);
  expect(context.callbacks.has('command-b')).toBe(true);
});

test('createCommandHistoryState disposes command subscriptions', async () => {
  const context = createContext();
  const state = await createCommandHistoryState(context.api);
  state.syncCommands([
    { command: 'command-a', handler: vi.fn() },
    { command: 'command-b', handler: vi.fn() },
  ]);

  state.dispose();

  expect(context.unregisterByName.get('command-a')).toHaveBeenCalledOnce();
  expect(context.unregisterByName.get('command-b')).toHaveBeenCalledOnce();
  expect(context.callbacks.size).toBe(0);
});

test('createCommandHistoryState ignores invalid persisted values', async () => {
  const context = createContext('{"select-theme":42}');

  const state = await createCommandHistoryState(context.api);

  expect(
    state
      .rankCandidates(
        [createCandidate('command-b', 'Command B'), createCandidate('command-a', 'Command A')],
        '',
      )
      .map(({ data }) => data.command),
  ).toEqual(['command-a', 'command-b']);
});
