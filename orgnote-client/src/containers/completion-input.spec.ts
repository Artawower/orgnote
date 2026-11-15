import { test, expect, beforeEach, vi, afterEach } from 'vitest';
import type * as VueI18n from 'vue-i18n';
import { mount } from '@vue/test-utils';
import CompletionInput from './CompletionInput.vue';
import { createTestingPinia } from '@pinia/testing';
import { ref, nextTick, shallowReactive, shallowRef, computed } from 'vue';
import type { Completion, CompletionConfig } from 'orgnote-api';

const openedCompletions = shallowRef<Completion<unknown>[]>([]);

const activeCompletion = computed(
  () => openedCompletions.value[openedCompletions.value.length - 1],
);

const openCompletion = (config: CompletionConfig<unknown>) => {
  const completion = shallowReactive<Completion<unknown>>({
    ...config,
    searchQuery: config.searchText ?? '',
    result: Promise.resolve(undefined),
  });
  openedCompletions.value = [...openedCompletions.value, completion];
};

const closeAllCompletions = () => {
  openedCompletions.value = [];
};

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useModal: vi.fn(() => ({
        config: ref({ fullScreen: false }),
        updateConfig: vi.fn(),
      })),
    },
    core: {
      useCompletion: vi.fn(() => ({
        get activeCompletion() {
          return activeCompletion.value;
        },
        close: vi.fn(),
        closeAll: closeAllCompletions,
        search: vi.fn(),
      })),
    },
  },
}));

vi.mock('vue-i18n', async () => {
  const actual = (await vi.importActual('vue-i18n')) as typeof VueI18n;
  return {
    ...actual,
    useI18n: vi.fn(() => ({
      t: vi.fn((key: string) => key),
    })),
  };
});

let wrapper: ReturnType<typeof mount>;

beforeEach(() => {
  openedCompletions.value = [];
});

afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
});

const mountCompletionInput = () => {
  wrapper = mount(CompletionInput, {
    props: {
      placeholder: 'Search...',
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
    },
  });
  return wrapper;
};

test('CompletionInput does not throw when activeCompletion is undefined on mount', () => {
  expect(() => mountCompletionInput()).not.toThrow();
});

test('CompletionInput does not throw when activeCompletion becomes undefined after mount', async () => {
  openCompletion({
    type: 'choice',
    searchText: 'test query',
    placeholder: 'Search',
    itemsGetter: () => ({
      result: [{ title: 'item', data: {}, commandHandler: vi.fn() }],
      total: 1,
    }),
  });

  mountCompletionInput();
  await nextTick();

  closeAllCompletions();
  await nextTick();

  expect(activeCompletion.value).toBeUndefined();
  expect(wrapper.exists()).toBe(true);
});

test('CompletionInput handleCompletionInput does not throw when activeCompletion is undefined', async () => {
  mountCompletionInput();
  await nextTick();

  const input = wrapper.find('input');
  if (input.exists()) {
    await expect(input.trigger('keypress', { key: 'Enter' })).resolves.not.toThrow();
  }
});

test('CompletionInput v-model does not crash when choice completion closes', async () => {
  openCompletion({
    type: 'choice',
    searchText: 'test',
    placeholder: 'Pick',
    itemsGetter: () => ({
      result: [{ title: 'Command', data: {}, commandHandler: vi.fn() }],
      total: 1,
    }),
  });

  mountCompletionInput();
  await nextTick();

  expect(activeCompletion.value?.searchQuery).toBe('test');

  closeAllCompletions();
  await nextTick();
  await nextTick();

  expect(activeCompletion.value).toBeUndefined();
  expect(wrapper.exists()).toBe(true);
});
