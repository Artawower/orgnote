import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive, ref, watchEffect } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';
import type { Completion, CompletionCandidate } from 'orgnote-api';

type RangeEmitter = (start: number, end: number) => void;

const scrollTo = vi.fn();
const search = vi.fn<(limit?: number, offset?: number) => Promise<void>>();
const logError = vi.fn();
const activeCompletion = ref<Completion<unknown>>();
const showGroup = ref(false);
let emitRange: RangeEmitter | undefined;
let itemsSize: number | undefined;

const completionStore = reactive({
  activeCompletion,
  search,
});

const configStore = reactive({
  config: reactive({
    completion: {
      defaultCompletionLimit: 20,
      showGroup,
    },
  }),
});

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useCompletion: () => completionStore,
      useConfig: () => configStore,
    },
  },
}));

vi.mock('src/boot/logger', () => ({
  logger: { error: logError },
}));

const AppVirtualListStub = defineComponent({
  name: 'AppVirtualList',
  props: {
    count: { type: Number, required: true },
  },
  emits: ['range'],
  setup(props, { emit, expose }) {
    emitRange = (start, end) => emit('range', { start, end });
    watchEffect(() => {
      itemsSize = props.count;
    });
    expose({ scrollToIndex: scrollTo });
    return () => h('div');
  },
});

const createCandidates = (count: number): CompletionCandidate[] =>
  Array.from({ length: count }, (_, index) => ({
    title: `Candidate ${index}`,
    data: index,
    commandHandler: vi.fn(),
  }));

const mountCompletionResult = async () => {
  const { default: CompletionResult } = await import('./CompletionResult.vue');
  return mount(CompletionResult, {
    global: {
      stubs: {
        AppVirtualList: AppVirtualListStub,
        AsyncItemContainer: true,
        CompletionResultItem: true,
      },
    },
  });
};

beforeEach(() => {
  scrollTo.mockClear();
  search.mockReset();
  search.mockResolvedValue(undefined);
  logError.mockClear();
  emitRange = undefined;
  itemsSize = undefined;
  showGroup.value = false;
  const candidates = createCandidates(25);
  activeCompletion.value = {
    type: 'choice',
    candidates,
    total: candidates.length,
    selectedCandidateIndex: 0,
    searchQuery: '',
    itemsGetter: () => ({ result: candidates, total: candidates.length }),
    result: Promise.resolve(),
  };
});

test('CompletionResult scrolls to the candidate selected with keyboard navigation', async () => {
  const wrapper = await mountCompletionResult();

  activeCompletion.value!.selectedCandidateIndex = 20;
  await nextTick();
  await nextTick();

  expect(scrollTo).toHaveBeenCalledWith(20);
  wrapper.unmount();
});

test('CompletionResult does not force selection into view when list size changes', async () => {
  const wrapper = await mountCompletionResult();
  await nextTick();
  scrollTo.mockClear();

  const candidates = createCandidates(24);
  activeCompletion.value!.candidates = candidates;
  activeCompletion.value!.total = candidates.length;
  await nextTick();
  await nextTick();

  expect(scrollTo).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('CompletionResult handles unloaded candidates while resolving the scroll index', async () => {
  const candidates = createCandidates(1);
  candidates.length = 25;
  activeCompletion.value = {
    type: 'choice',
    candidates,
    total: candidates.length,
    selectedCandidateIndex: 0,
    searchQuery: '',
    itemsGetter: () => ({ result: candidates, total: candidates.length }),
    result: Promise.resolve(),
  };
  const wrapper = await mountCompletionResult();

  activeCompletion.value.selectedCandidateIndex = 20;
  await nextTick();
  await nextTick();

  expect(scrollTo).toHaveBeenCalledWith(20);
  wrapper.unmount();
});

test('CompletionResult retries an unloaded range after its request settles', async () => {
  const sparseCandidates = createCandidates(1);
  sparseCandidates.length = 25;
  const candidates = [...sparseCandidates];
  activeCompletion.value = {
    type: 'choice',
    candidates,
    total: candidates.length,
    selectedCandidateIndex: 0,
    searchQuery: '',
    itemsGetter: () => ({ result: candidates, total: candidates.length }),
    result: Promise.resolve(),
  };
  let resolveSearch: (() => void) | undefined;
  const pendingSearch = new Promise<void>((resolve) => {
    resolveSearch = resolve;
  });
  search.mockReturnValueOnce(pendingSearch);
  const wrapper = await mountCompletionResult();

  emitRange?.(20, 24);
  emitRange?.(20, 24);
  expect(search).toHaveBeenCalledTimes(1);

  resolveSearch?.();
  await pendingSearch;
  await flushPromises();
  emitRange?.(20, 24);

  expect(search).toHaveBeenCalledTimes(2);
  wrapper.unmount();
});

test('CompletionResult keeps a newer pending request when an older request settles', async () => {
  const sparseCandidates = createCandidates(1);
  sparseCandidates.length = 25;
  activeCompletion.value!.candidates = [...sparseCandidates];
  activeCompletion.value!.total = sparseCandidates.length;
  let resolveFirstSearch: (() => void) | undefined;
  let resolveSecondSearch: (() => void) | undefined;
  const firstSearch = new Promise<void>((resolve) => {
    resolveFirstSearch = resolve;
  });
  const secondSearch = new Promise<void>((resolve) => {
    resolveSecondSearch = resolve;
  });
  search.mockReturnValueOnce(firstSearch).mockReturnValueOnce(secondSearch);
  const wrapper = await mountCompletionResult();

  emitRange?.(20, 24);
  activeCompletion.value!.searchQuery = 'next';
  await nextTick();
  emitRange?.(20, 24);
  resolveFirstSearch?.();
  await firstSearch;
  await flushPromises();
  emitRange?.(20, 24);

  expect(search).toHaveBeenCalledTimes(2);
  resolveSecondSearch?.();
  await secondSearch;
  wrapper.unmount();
});

test('CompletionResult retries an unloaded range after its request fails', async () => {
  const sparseCandidates = createCandidates(1);
  sparseCandidates.length = 25;
  const candidates = [...sparseCandidates];
  activeCompletion.value = {
    type: 'choice',
    candidates,
    total: candidates.length,
    selectedCandidateIndex: 0,
    searchQuery: '',
    itemsGetter: () => ({ result: candidates, total: candidates.length }),
    result: Promise.resolve(),
  };
  const searchError = new Error('Range request failed');
  search.mockRejectedValueOnce(searchError);
  const wrapper = await mountCompletionResult();

  emitRange?.(20, 24);
  await flushPromises();
  emitRange?.(20, 24);

  expect(search).toHaveBeenCalledTimes(2);
  expect(logError).toHaveBeenCalledWith('Completion range search failed', {
    error: searchError,
    from: 20,
    size: 5,
  });
  wrapper.unmount();
});

test('CompletionResult disables grouping while candidates remain unloaded', async () => {
  showGroup.value = true;
  const candidates = createCandidates(1);
  candidates[0]!.group = 'Primary';
  candidates.length = 25;
  activeCompletion.value = {
    type: 'choice',
    candidates,
    total: candidates.length,
    selectedCandidateIndex: 0,
    searchQuery: '',
    itemsGetter: () => ({ result: candidates, total: candidates.length }),
    result: Promise.resolve(),
  };

  const wrapper = await mountCompletionResult();

  expect(itemsSize).toBe(25);
  wrapper.unmount();
});

test('CompletionResult does not reserve a group row for an ungrouped candidate', async () => {
  showGroup.value = true;
  const candidates = createCandidates(1);
  activeCompletion.value = {
    type: 'choice',
    candidates,
    total: candidates.length,
    selectedCandidateIndex: 0,
    searchQuery: '417',
    itemsGetter: () => ({ result: candidates, total: candidates.length }),
    result: Promise.resolve(),
  };

  const wrapper = await mountCompletionResult();

  expect(itemsSize).toBe(1);
  wrapper.unmount();
});

test('CompletionResult scrolls again when grouping changes the selected display index', async () => {
  showGroup.value = true;
  const sparseCandidates = createCandidates(2);
  sparseCandidates[0]!.group = 'Primary';
  sparseCandidates[1]!.group = 'Primary';
  sparseCandidates.length = 3;
  const candidates = [...sparseCandidates];
  activeCompletion.value = {
    type: 'choice',
    candidates,
    total: candidates.length,
    selectedCandidateIndex: 0,
    searchQuery: '',
    itemsGetter: () => ({ result: candidates, total: candidates.length }),
    result: Promise.resolve(),
  };
  const wrapper = await mountCompletionResult();

  activeCompletion.value.selectedCandidateIndex = 2;
  await nextTick();
  await nextTick();
  expect(scrollTo).toHaveBeenLastCalledWith(2);

  activeCompletion.value.candidates![2] = {
    title: 'Third',
    data: 3,
    group: 'Secondary',
    commandHandler: vi.fn(),
  };
  await nextTick();
  await nextTick();

  expect(scrollTo).toHaveBeenLastCalledWith(4);
  wrapper.unmount();
});

test('CompletionResult keeps non-contiguous group candidates in one virtual section', async () => {
  showGroup.value = true;
  const candidates: CompletionCandidate[] = [
    { title: 'A1', data: 1, group: 'A', commandHandler: vi.fn() },
    { title: 'B1', data: 2, group: 'B', commandHandler: vi.fn() },
    { title: 'A2', data: 3, group: 'A', commandHandler: vi.fn() },
  ];
  activeCompletion.value = {
    type: 'choice',
    candidates,
    total: candidates.length,
    selectedCandidateIndex: 0,
    searchQuery: '',
    itemsGetter: () => ({ result: candidates, total: candidates.length }),
    result: Promise.resolve(),
  };
  const wrapper = await mountCompletionResult();

  activeCompletion.value.selectedCandidateIndex = 2;
  await nextTick();
  await nextTick();

  expect(itemsSize).toBe(5);
  expect(scrollTo).toHaveBeenLastCalledWith(2);
  wrapper.unmount();
});

test('CompletionResult accounts for group headers when scrolling to a candidate', async () => {
  showGroup.value = true;
  const candidates: CompletionCandidate[] = [
    { title: 'First', data: 1, group: 'Primary', commandHandler: vi.fn() },
    { title: 'Second', data: 2, group: 'Secondary', commandHandler: vi.fn() },
  ];
  activeCompletion.value = {
    type: 'choice',
    candidates,
    total: candidates.length,
    selectedCandidateIndex: 0,
    searchQuery: '',
    itemsGetter: () => ({ result: candidates, total: candidates.length }),
    result: Promise.resolve(),
  };
  const wrapper = await mountCompletionResult();

  activeCompletion.value!.selectedCandidateIndex = 1;
  await nextTick();
  await nextTick();

  expect(scrollTo).toHaveBeenCalledWith(3);
  wrapper.unmount();
});

test('CompletionResult loads every unloaded page that the visible range touches', async () => {
  const sparseCandidates = createCandidates(1);
  sparseCandidates.length = 45;
  activeCompletion.value!.candidates = [...sparseCandidates];
  activeCompletion.value!.total = sparseCandidates.length;
  const wrapper = await mountCompletionResult();

  emitRange?.(15, 24);
  emitRange?.(16, 25);

  expect(search.mock.calls).toEqual([
    [20, 0],
    [20, 20],
  ]);
  wrapper.unmount();
});

test('CompletionResult reloads the visible page after the search query changes', async () => {
  const sparseCandidates = createCandidates(1);
  sparseCandidates.length = 45;
  activeCompletion.value!.candidates = [...sparseCandidates];
  activeCompletion.value!.total = sparseCandidates.length;
  const wrapper = await mountCompletionResult();
  emitRange?.(20, 24);
  await flushPromises();
  search.mockClear();

  activeCompletion.value!.candidates = [...sparseCandidates];
  activeCompletion.value!.searchQuery = 'next';
  await nextTick();

  expect(search).toHaveBeenCalledWith(20, 20);
  wrapper.unmount();
});
