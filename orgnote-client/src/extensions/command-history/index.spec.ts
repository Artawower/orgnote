import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type {
  Command,
  CompletionCandidate,
  CompletionInterceptor,
  OrgNoteApi,
} from 'orgnote-api';
import { nextTick, shallowRef, triggerRef } from 'vue';
import { commandHistoryExtension } from './index';

const historyState = vi.hoisted(() => ({
  syncCommands: vi.fn(),
  rankCandidates: vi.fn((candidates: CompletionCandidate<Command>[]) => candidates),
  dispose: vi.fn(),
}));
const createCommandHistoryState = vi.hoisted(() => vi.fn(async () => historyState));

vi.mock('./state', () => ({ createCommandHistoryState }));

const testState: {
  registeredInterceptor?: CompletionInterceptor<Command>;
  unregisterInterceptor: ReturnType<typeof vi.fn>;
} = {
  unregisterInterceptor: vi.fn(),
};
const mountedApis = new Set<OrgNoteApi>();

const createApi = () => {
  const commandsState = shallowRef<Command[]>([
    { command: 'command-a', handler: vi.fn() },
    { command: 'command-b', handler: vi.fn() },
  ]);
  testState.unregisterInterceptor = vi.fn();
  const completion = {
    registerInterceptor: vi.fn((interceptor: CompletionInterceptor<Command>) => {
      testState.registeredInterceptor = interceptor;
      return testState.unregisterInterceptor;
    }),
  };
  const commandsStore = {
    get commands(): Command[] {
      return commandsState.value;
    },
  };
  const api = {
    core: {
      useCompletion: () => completion,
      useCommands: () => commandsStore,
    },
  } as unknown as OrgNoteApi;

  return { api, commandsState, completion };
};

const mountExtension = async (api: OrgNoteApi): Promise<void> => {
  mountedApis.add(api);
  await commandHistoryExtension.onMounted?.(api);
};

beforeEach(() => {
  testState.registeredInterceptor = undefined;
});

afterEach(async () => {
  await Promise.all(
    [...mountedApis].map((api) => commandHistoryExtension.onUnmounted?.(api)),
  );
  mountedApis.clear();
  vi.clearAllMocks();
});

test('commandHistoryExtension mounts history state', async () => {
  const { api } = createApi();

  await mountExtension(api);

  expect(createCommandHistoryState).toHaveBeenCalledWith(api);
});

test('commandHistoryExtension registers commands interceptor', async () => {
  const { api, completion } = createApi();

  await mountExtension(api);

  expect(completion.registerInterceptor).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'command-history-sorter',
      target: 'commands',
      priority: 100,
    }),
  );
});

test('commandHistoryExtension synchronizes initial commands', async () => {
  const { api, commandsState } = createApi();

  await mountExtension(api);

  expect(historyState.syncCommands).toHaveBeenCalledWith(commandsState.value);
});

test('commandHistoryExtension synchronizes commands registered later', async () => {
  const { api, commandsState } = createApi();
  await mountExtension(api);
  historyState.syncCommands.mockClear();

  commandsState.value.push({ command: 'late-command', handler: vi.fn() });
  triggerRef(commandsState);
  await nextTick();

  expect(historyState.syncCommands).toHaveBeenCalledWith(commandsState.value);
});

test('commandHistoryExtension sorts candidates without search query', async () => {
  const { api } = createApi();
  const candidates: CompletionCandidate<Command>[] = [];
  await mountExtension(api);

  await testState.registeredInterceptor?.handler(candidates, {
    completionName: 'commands',
    searchQuery: '',
  });

  expect(historyState.rankCandidates).toHaveBeenCalledWith(candidates, '');
});

test('commandHistoryExtension forwards search query to history state', async () => {
  const { api } = createApi();
  const candidates: CompletionCandidate<Command>[] = [];
  await mountExtension(api);

  const result = await testState.registeredInterceptor?.handler(candidates, {
    completionName: 'commands',
    searchQuery: 'theme',
  });

  expect(result).toBe(candidates);
  expect(historyState.rankCandidates).toHaveBeenCalledWith(candidates, 'theme');
});

test('commandHistoryExtension disposes state and interceptor on unmount', async () => {
  const { api } = createApi();
  await mountExtension(api);

  await commandHistoryExtension.onUnmounted?.(api);
  mountedApis.delete(api);

  expect(testState.unregisterInterceptor).toHaveBeenCalledOnce();
  expect(historyState.dispose).toHaveBeenCalledOnce();
});

test('commandHistoryExtension stops command synchronization on unmount', async () => {
  const { api, commandsState } = createApi();
  await mountExtension(api);
  await commandHistoryExtension.onUnmounted?.(api);
  mountedApis.delete(api);
  historyState.syncCommands.mockClear();

  commandsState.value.push({ command: 'late-command', handler: vi.fn() });
  triggerRef(commandsState);
  await nextTick();

  expect(historyState.syncCommands).not.toHaveBeenCalled();
});

test('commandHistoryExtension cleans previous mount for same API', async () => {
  const { api } = createApi();
  await mountExtension(api);
  testState.unregisterInterceptor.mockClear();
  historyState.dispose.mockClear();

  await commandHistoryExtension.onMounted?.(api);

  expect(testState.unregisterInterceptor).toHaveBeenCalledOnce();
  expect(historyState.dispose).toHaveBeenCalledOnce();
});
