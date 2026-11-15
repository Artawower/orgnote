import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { CompletionCandidate, CompletionSearchResult } from 'orgnote-api';
import { useCompletionStore } from './completion';

const mockModalClose = vi.fn();
const mockModalOpen = vi.fn(() => Promise.resolve(undefined));
const mockModalCloseAll = vi.fn();

vi.mock('./modal', () => ({
  useModalStore: vi.fn(() => ({
    open: mockModalOpen,
    close: mockModalClose,
    closeAll: mockModalCloseAll,
  })),
}));

vi.mock('./config', () => ({
  useConfigStore: vi.fn(() => ({
    config: {
      completion: {
        defaultCompletionLimit: 20,
        showGroup: false,
      },
    },
  })),
}));

vi.mock('src/containers/AppCompletion.vue', () => ({
  default: { name: 'AppCompletion' },
}));

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

test('open calls modal.open with correct config', async () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    placeholder: 'Search...',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  expect(mockModalOpen).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      noBodyPadding: true,
      position: 'top',
    }),
  );
});

test('open with input type sets mini modal', async () => {
  const store = useCompletionStore();

  store.open({
    type: 'input',
    placeholder: 'Enter value',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  expect(mockModalOpen).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      mini: true,
    }),
  );
});

test('open with choice type sets mini to false', async () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    placeholder: 'Select',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  expect(mockModalOpen).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      mini: false,
    }),
  );
});

test('open with searchText pre-fills query', async () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    searchText: 'initial query',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  vi.advanceTimersByTime(100);

  expect(store.activeCompletion?.searchQuery).toBe('initial query');
});

test('open creates active completion', async () => {
  const store = useCompletionStore();

  expect(store.activeCompletion).toBeUndefined();

  store.open({
    type: 'choice',
    placeholder: 'Test',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  expect(store.activeCompletion).toBeDefined();
  expect(store.activeCompletion?.type).toBe('choice');
});

test('nested completions stack in openedCompletions', async () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    placeholder: 'First',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  store.open({
    type: 'choice',
    placeholder: 'Second',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  store.open({
    type: 'choice',
    placeholder: 'Third',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  expect(store.activeCompletion?.placeholder).toBe('Third');
});

test('close calls modal.close with data', () => {
  const store = useCompletionStore();
  store.close({ selected: 'item' });

  expect(mockModalClose).toHaveBeenCalledWith({ selected: 'item' });
});

test('close calls modal.close without data', () => {
  const store = useCompletionStore();
  store.close();

  expect(mockModalClose).toHaveBeenCalledWith(undefined);
});

test('closeAll closes all modals and clears completions', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter: () => ({ result: [], total: 0 }),
  });
  store.open({
    type: 'choice',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  store.closeAll();

  expect(mockModalCloseAll).toHaveBeenCalled();
});

test('closeAll does not error when no completions open', () => {
  const store = useCompletionStore();
  expect(() => store.closeAll()).not.toThrow();
});

test('nextCandidate increments selectedCandidateIndex', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => ({ result: [], total: 2 }) as any,
  });

  vi.advanceTimersByTime(100);

  store.activeCompletion!.total = 5;
  store.activeCompletion!.selectedCandidateIndex = 0;

  store.nextCandidate();
  expect(store.activeCompletion?.selectedCandidateIndex).toBe(1);
});

test('nextCandidate wraps from last to first', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter: () => ({ result: [], total: 3 }),
  });

  store.activeCompletion!.total = 3;
  store.activeCompletion!.selectedCandidateIndex = 2;

  store.nextCandidate();
  expect(store.activeCompletion?.selectedCandidateIndex).toBe(0);
});

test('nextCandidate sets to 1 when index is null', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter: () => ({ result: [], total: 5 }),
  });

  store.activeCompletion!.total = 5;
  store.activeCompletion!.selectedCandidateIndex = undefined;

  store.nextCandidate();
  expect(store.activeCompletion?.selectedCandidateIndex).toBe(1);
});

test('nextCandidate does nothing when no completion active', () => {
  const store = useCompletionStore();
  expect(() => store.nextCandidate()).not.toThrow();
});

test('nextCandidate does nothing when total is null', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  store.activeCompletion!.total = undefined;
  store.activeCompletion!.selectedCandidateIndex = 0;

  store.nextCandidate();
  expect(store.activeCompletion?.selectedCandidateIndex).toBe(0);
});

test('previousCandidate decrements selectedCandidateIndex', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter: () => ({ result: [], total: 5 }),
  });

  store.activeCompletion!.total = 5;
  store.activeCompletion!.selectedCandidateIndex = 2;

  store.previousCandidate();
  expect(store.activeCompletion?.selectedCandidateIndex).toBe(1);
});

test('previousCandidate wraps from first to last', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter: () => ({ result: [], total: 5 }),
  });

  store.activeCompletion!.total = 5;
  store.activeCompletion!.selectedCandidateIndex = 0;

  store.previousCandidate();
  expect(store.activeCompletion?.selectedCandidateIndex).toBe(4);
});

test('previousCandidate sets to last when index is null', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter: () => ({ result: [], total: 5 }),
  });

  store.activeCompletion!.total = 5;
  store.activeCompletion!.selectedCandidateIndex = undefined;

  store.previousCandidate();
  expect(store.activeCompletion?.selectedCandidateIndex).toBe(4);
});

test('previousCandidate does nothing when no completion active', () => {
  const store = useCompletionStore();
  expect(() => store.previousCandidate()).not.toThrow();
});

test('acceptAutocomplete fills search query from selected input-choice candidate', () => {
  const store = useCompletionStore();
  const candidates: CompletionCandidate[] = [
    { title: '/notes/', data: {}, commandHandler: vi.fn() },
    { title: '/notes/project.org', data: {}, commandHandler: vi.fn() },
  ];

  store.open({
    type: 'input-choice',
    itemsGetter: () => ({ result: [], total: 0 }),
  });
  store.activeCompletion!.candidates = candidates;
  store.activeCompletion!.selectedCandidateIndex = 1;

  store.acceptAutocomplete();

  expect(store.activeCompletion?.searchQuery).toBe('/notes/project.org');
});

test('acceptAutocomplete defaults to first input-choice candidate', () => {
  const store = useCompletionStore();

  store.open({
    type: 'input-choice',
    itemsGetter: () => ({ result: [], total: 0 }),
  });
  store.activeCompletion!.candidates = [
    { title: '/default.org', data: {}, commandHandler: vi.fn() },
  ];

  store.acceptAutocomplete();

  expect(store.activeCompletion?.searchQuery).toBe('/default.org');
});

test('acceptAutocomplete ignores choice completion', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    searchText: 'cli',
    itemsGetter: () => ({ result: [], total: 0 }),
  });
  store.activeCompletion!.candidates = [
    { title: 'copy CLI install command', data: {}, commandHandler: vi.fn() },
  ];

  store.acceptAutocomplete();

  expect(store.activeCompletion?.searchQuery).toBe('cli');
});

test('acceptAutocomplete ignores plain input completion', () => {
  const store = useCompletionStore();

  store.open({
    type: 'input',
    searchText: 'draft',
  });

  store.acceptAutocomplete();

  expect(store.activeCompletion?.searchQuery).toBe('draft');
});

test('canAcceptAutocomplete is false without input-choice candidate title', () => {
  const store = useCompletionStore();

  store.open({
    type: 'input-choice',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  expect(store.canAcceptAutocomplete()).toBe(false);

  store.activeCompletion!.candidates = [{ data: {}, commandHandler: vi.fn() }];

  expect(store.canAcceptAutocomplete()).toBe(false);
});

test('canAcceptAutocomplete accepts case-insensitive prefix match', () => {
  const store = useCompletionStore();

  store.open({
    type: 'input-choice',
    searchText: '/Notes/Pro',
    itemsGetter: () => ({ result: [], total: 0 }),
  });
  store.activeCompletion!.candidates = [
    { title: '/notes/project.org', data: {}, commandHandler: vi.fn() },
  ];

  expect(store.canAcceptAutocomplete()).toBe(true);
});

test('acceptAutocomplete ignores selected candidate that no longer matches input', () => {
  const store = useCompletionStore();

  store.open({
    type: 'input-choice',
    searchText: '/notes/project extra',
    itemsGetter: () => ({ result: [], total: 0 }),
  });
  store.activeCompletion!.candidates = [
    { title: '/notes/project.org', data: {}, commandHandler: vi.fn() },
  ];

  expect(store.canAcceptAutocomplete()).toBe(false);

  store.acceptAutocomplete();

  expect(store.activeCompletion?.searchQuery).toBe('/notes/project extra');
});

test('search triggers itemsGetter on open', () => {
  const itemsGetter = vi.fn(() => ({ result: [], total: 0 }));
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter,
  });

  vi.advanceTimersByTime(100);

  expect(itemsGetter).toHaveBeenCalled();
});

test('search called with limit from config', () => {
  const itemsGetter = vi.fn(() => ({ result: [], total: 0 }));
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter,
  });

  vi.advanceTimersByTime(100);

  expect(itemsGetter).toHaveBeenCalledWith('', 20, 0);
});

test('search with leading option calls immediately', () => {
  const itemsGetter = vi.fn(() => ({ result: [], total: 0 }));
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    itemsGetter,
  });

  vi.advanceTimersByTime(100);

  expect(itemsGetter).toHaveBeenCalled();
});

test('search skipped for input type', () => {
  const itemsGetter = vi.fn(() => ({ result: [], total: 0 }));
  const store = useCompletionStore();

  store.open({
    type: 'input',
    itemsGetter,
  });

  vi.advanceTimersByTime(100);

  expect(itemsGetter).not.toHaveBeenCalled();
});

test('search handles async itemsGetter', async () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => Promise.resolve({ result: [{ title: 'Result' }], total: 1 }) as any,
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(store.activeCompletion?.candidates).toHaveLength(1);
  expect(store.activeCompletion?.total).toBe(1);
});

test('search handles sync itemsGetter', async () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => ({ result: [{ title: 'Sync Result', data: {}, commandHandler: vi.fn() }], total: 1 }) as any,
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(store.activeCompletion?.candidates).toHaveLength(1);
});

test('search resets loading and rejects when itemsGetter throws', async () => {
  const searchError = new Error('Search failed');
  const itemsGetter = vi.fn((): CompletionSearchResult => ({ result: [], total: 0 }));
  const store = useCompletionStore();

  store.open({ type: 'choice', itemsGetter });
  await vi.runAllTimersAsync();
  itemsGetter.mockImplementationOnce(() => {
    throw searchError;
  });

  await expect(store.search()).rejects.toBe(searchError);
  expect(store.isLoading).toBe(false);
});

test('search with offset merges into existing candidates', async () => {
  const store = useCompletionStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsGetter = (query: string, limit?: number, offset?: number): any => {
    if (!offset) {
      return Promise.resolve({
        result: [{ title: 'Item 0' }, { title: 'Item 1' }],
        total: 10,
      });
    }
    return Promise.resolve({
      result: [{ title: 'Item 2' }, { title: 'Item 3' }],
      total: 10,
    });
  };

  store.open({
    type: 'choice',
    itemsGetter,
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(store.activeCompletion?.candidates).toHaveLength(2);

  store.search(20, 2);
  await vi.runAllTimersAsync();

  expect(store.activeCompletion?.candidates?.length).toBeGreaterThanOrEqual(4);
});

test('search merges concurrent ranges for the same query regardless of response order', async () => {
  const store = useCompletionStore();
  const pageResolvers = new Map<number, (result: CompletionSearchResult) => void>();
  const createCandidate = (index: number): CompletionCandidate => ({
    title: `Item ${index}`,
    data: index,
    commandHandler: vi.fn(),
  });
  const itemsGetter = vi.fn(
    (_query: string, _limit?: number, offset: number = 0): CompletionSearchResult | Promise<CompletionSearchResult> => {
      if (!offset) return { result: [createCandidate(0)], total: 30 };
      return new Promise((resolve) => pageResolvers.set(offset, resolve));
    },
  );

  store.open({ type: 'choice', itemsGetter });
  await vi.runAllTimersAsync();

  const firstSearch = store.search(5, 20);
  const secondSearch = store.search(5, 25);
  pageResolvers.get(25)?.({ result: [createCandidate(25)], total: 30 });
  await secondSearch;
  pageResolvers.get(20)?.({ result: [createCandidate(20)], total: 30 });
  await firstSearch;

  expect(store.activeCompletion?.candidates?.[20]?.title).toBe('Item 20');
  expect(store.activeCompletion?.candidates?.[25]?.title).toBe('Item 25');
});

test('search removes phantom candidates when the final page is shorter than reported', async () => {
  const store = useCompletionStore();
  const createCandidate = (index: number): CompletionCandidate => ({
    title: `Item ${index}`,
    data: index,
    commandHandler: vi.fn(),
  });
  const itemsGetter = vi.fn(
    (_query: string, _limit?: number, offset: number = 0): CompletionSearchResult => ({
      result: offset === 0 ? Array.from({ length: 20 }, (_, index) => createCandidate(index)) : [createCandidate(20)],
      total: 22,
    }),
  );

  store.open({ type: 'choice', itemsGetter });
  await vi.runAllTimersAsync();
  store.activeCompletion!.selectedCandidateIndex = 21;

  store.search(10, 20);
  await vi.runAllTimersAsync();

  expect(itemsGetter).toHaveBeenLastCalledWith('', 10, 20);
  expect(store.activeCompletion?.total).toBe(21);
  expect(store.activeCompletion?.selectedCandidateIndex).toBe(0);
});

test('search sets selectedCandidateIndex to 0 on initial search', async () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => Promise.resolve({ result: [{ title: 'a' }], total: 1 }) as any,
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(store.activeCompletion?.selectedCandidateIndex).toBe(0);
});

test('restore reopens last modal config', async () => {
  const store = useCompletionStore();

  const config = {
    type: 'choice' as const,
    placeholder: 'Restore Test',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => ({ result: [], total: 0 }) as any,
  };

  mockModalOpen.mockResolvedValueOnce(undefined);

  const openPromise = store.open(config);
  await vi.runAllTimersAsync();
  await openPromise;

  mockModalOpen.mockClear();

  store.restore();

  expect(mockModalOpen).toHaveBeenCalled();
});

test('restore does nothing when no previous config', () => {
  const store = useCompletionStore();
  expect(() => store.restore()).not.toThrow();
  expect(mockModalOpen).not.toHaveBeenCalled();
});

test('activeCompletion returns last opened completion', () => {
  const store = useCompletionStore();

  store.open({
    type: 'choice',
    placeholder: 'First',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  store.open({
    type: 'input',
    placeholder: 'Second',
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  expect(store.activeCompletion?.placeholder).toBe('Second');
  expect(store.activeCompletion?.type).toBe('input');
});

test('activeCompletion is undefined when no completions', () => {
  const store = useCompletionStore();
  expect(store.activeCompletion).toBeUndefined();
});

test('search updates total from processed candidates length', async () => {
  const store = useCompletionStore();
  const candidates: CompletionCandidate<unknown>[] = [
    { title: 'a', data: {}, commandHandler: vi.fn() },
    { title: 'b', data: {}, commandHandler: vi.fn() },
  ];
  const searchResult: CompletionSearchResult<unknown> = {
    result: candidates,
    total: 100,
  };

  store.registerInterceptor({
    name: 'filter-interceptor',
    target: 'filter-test',
    handler: (candidates) => candidates.slice(0, 1),
  });

  store.open({
    name: 'filter-test',
    type: 'choice',
    itemsGetter: () => Promise.resolve(searchResult),
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(store.activeCompletion?.total).toBe(1);
});

test('search keeps total when interceptor only reorders', async () => {
  const store = useCompletionStore();
  const candidates: CompletionCandidate<unknown>[] = [
    { title: 'a', data: {}, commandHandler: vi.fn() },
    { title: 'b', data: {}, commandHandler: vi.fn() },
  ];
  const searchResult: CompletionSearchResult<unknown> = {
    result: candidates,
    total: 100,
  };

  store.registerInterceptor({
    name: 'reorder-interceptor',
    target: 'total-test',
    handler: (candidates) => [...candidates].reverse(),
  });

  store.open({
    name: 'total-test',
    type: 'choice',
    itemsGetter: () => Promise.resolve(searchResult),
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(store.activeCompletion?.total).toBe(100);
});

test('registerInterceptor adds interceptor', () => {
  const store = useCompletionStore();

  const unregister = store.registerInterceptor({
    name: 'test-interceptor',
    target: 'test-completion',
    handler: (candidates) => candidates,
  });

  expect(typeof unregister).toBe('function');
});

test('registerInterceptor returns unregister function', () => {
  const store = useCompletionStore();

  const unregister = store.registerInterceptor({
    name: 'test-interceptor',
    target: 'test-completion',
    handler: (candidates) => candidates,
  });

  expect(() => unregister()).not.toThrow();
});



test('interceptor is applied to matching completion name', async () => {
  const store = useCompletionStore();
  const interceptorFn = vi.fn((candidates) => [
    ...candidates,
    { title: 'Added by interceptor', data: {}, commandHandler: vi.fn() },
  ]);

  store.registerInterceptor({
    name: 'test-interceptor',
    target: 'test-completion',
    handler: interceptorFn,
  });

  store.open({
    name: 'test-completion',
    type: 'choice',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => ({ result: [{ title: 'Original', data: {}, commandHandler: vi.fn() }], total: 1 }) as any,
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(interceptorFn).toHaveBeenCalled();
  expect(store.activeCompletion?.candidates).toHaveLength(2);
});

test('interceptor is not applied to non-matching completion name', async () => {
  const store = useCompletionStore();
  const interceptorFn = vi.fn((candidates) => candidates);

  store.registerInterceptor({
    name: 'test-interceptor',
    target: 'other-completion',
    handler: interceptorFn,
  });

  store.open({
    name: 'test-completion',
    type: 'choice',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => ({ result: [{ title: 'Original', data: {}, commandHandler: vi.fn() }], total: 1 }) as any,
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(interceptorFn).not.toHaveBeenCalled();
});

test('interceptor with wildcard target matches all completions', async () => {
  const store = useCompletionStore();
  const interceptorFn = vi.fn((candidates) => candidates);

  store.registerInterceptor({
    name: 'test-interceptor',
    target: '*',
    handler: interceptorFn,
  });

  store.open({
    name: 'any-completion',
    type: 'choice',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => ({ result: [{ title: 'Original', data: {}, commandHandler: vi.fn() }], total: 1 }) as any,
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(interceptorFn).toHaveBeenCalled();
});

test('interceptor with array target matches multiple completion names', async () => {
  const store = useCompletionStore();
  const interceptorFn = vi.fn((candidates) => candidates);

  store.registerInterceptor({
    name: 'test-interceptor',
    target: ['completion-a', 'completion-b'],
    handler: interceptorFn,
  });

  store.open({
    name: 'completion-b',
    type: 'choice',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => ({ result: [{ title: 'Original', data: {}, commandHandler: vi.fn() }], total: 1 }) as any,
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  expect(interceptorFn).toHaveBeenCalled();
});

test('multiple interceptors are applied in priority order', async () => {
  const store = useCompletionStore();
  const callOrder: string[] = [];

  const unregisterLow = store.registerInterceptor({
    name: 'low-priority',
    target: 'priority-test',
    priority: 10,
    handler: (candidates) => {
      callOrder.push('low');
      return candidates;
    },
  });

  const unregisterHigh = store.registerInterceptor({
    name: 'high-priority',
    target: 'priority-test',
    priority: 100,
    handler: (candidates) => {
      callOrder.push('high');
      return candidates;
    },
  });

  store.open({
    name: 'priority-test',
    type: 'choice',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsGetter: () => ({ result: [{ title: 'Original', data: {}, commandHandler: vi.fn() }], total: 1 }) as any,
  });

  vi.advanceTimersByTime(100);
  await vi.runAllTimersAsync();

  const firstInterceptorCall = callOrder.slice(0, 2);
  expect(firstInterceptorCall).toEqual(['high', 'low']);

  unregisterLow();
  unregisterHigh();
});

test('close keeps input completion open when validation fails', async () => {
  const store = useCompletionStore();
  store.open({
    type: 'input',
    placeholder: 'Enter value',
    validateInput: () => ({ valid: false, message: 'Invalid value' }),
  });

  const closed = await store.close('bad');

  expect(closed).toBe(false);
  expect(mockModalClose).not.toHaveBeenCalled();
  expect(store.activeCompletion?.validationError).toBe('Invalid value');
});

test('close resolves input completion when validation passes', async () => {
  const store = useCompletionStore();
  store.open({
    type: 'input',
    placeholder: 'Enter value',
    validateInput: () => ({ valid: true }),
  });

  const closed = await store.close('good');

  expect(closed).toBe(true);
  expect(mockModalClose).toHaveBeenCalledWith('good');
  expect(store.activeCompletion?.validationError).toBeUndefined();
});
