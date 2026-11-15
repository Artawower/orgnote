import { test, expect, beforeEach, vi, afterEach } from 'vitest';
import type * as VueI18n from 'vue-i18n';
import { mount } from '@vue/test-utils';
import AppCompletion from './AppCompletion.vue';
import { createTestingPinia } from '@pinia/testing';
import { ref, nextTick, shallowReactive, shallowRef, computed, reactive } from 'vue';
import type { Completion, CompletionConfig } from 'orgnote-api';

const openedCompletions = shallowRef<Completion<unknown>[]>([]);
const keyboardOpened = ref(false);
const keyboardHeight = ref(0);
const desktopBelow = ref(false);

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
      useScreenDetection: vi.fn(() => ({
        desktopBelow,
      })),
      useKeyboardState: vi.fn(() => ({
        keyboardOpened,
        keyboardHeight,
      })),
    },
    core: {
      useCompletion: vi.fn(() =>
        reactive({
          activeCompletion,
          close: vi.fn(),
          closeAll: closeAllCompletions,
          search: vi.fn(),
        }),
      ),
      useFileSearch: vi.fn(() =>
        reactive({
          isSearching: ref(false),
        }),
      ),
      useConfig: vi.fn(() =>
        reactive({
          config: ref({
            completion: {
              defaultCompletionLimit: 20,
              showGroup: false,
            },
          }),
        }),
      ),
      useNotifications: vi.fn(() => ({
        notifications: ref([]),
      })),
      useKeybindings: vi.fn(() => ({
        pushContext: vi.fn(() => vi.fn()),
        popContext: vi.fn(),
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
  keyboardOpened.value = false;
  keyboardHeight.value = 0;
  desktopBelow.value = false;
});

afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
});

const mountAppCompletion = () => {
  wrapper = mount(AppCompletion, {
    props: {
      placeholder: 'Search...',
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
    },
  });
  return wrapper;
};

test('AppCompletion does not throw when activeCompletion is undefined on mount', () => {
  expect(() => mountAppCompletion()).not.toThrow();
});

test('AppCompletion does not throw when choice completion is closed during render cycle', async () => {
  openCompletion({
    type: 'choice',
    placeholder: 'Pick a command',
    itemsGetter: () => ({
      result: [{ title: 'Test command', data: {}, commandHandler: vi.fn() }],
      total: 1,
    }),
  });

  mountAppCompletion();
  await nextTick();

  closeAllCompletions();
  await nextTick();
  await nextTick();

  expect(wrapper.exists()).toBe(true);
});

test('AppCompletion footer does not crash when activeCompletion becomes undefined', async () => {
  openCompletion({
    type: 'choice',
    placeholder: 'Test',
    itemsGetter: () => ({
      result: [{ title: 'item', data: {}, commandHandler: vi.fn() }],
      total: 1,
    }),
  });

  const c = activeCompletion.value!;
  c.candidates = [{ title: 'item', data: {}, commandHandler: vi.fn() }];
  c.total = 1;
  c.selectedCandidateIndex = 0;

  mountAppCompletion();
  await nextTick();

  closeAllCompletions();
  await nextTick();

  expect(activeCompletion.value).toBeUndefined();
  expect(wrapper.exists()).toBe(true);
});

test('AppCompletion itemHeight computed does not crash when activeCompletion is undefined', async () => {
  openCompletion({
    type: 'choice',
    placeholder: 'Test',
    itemHeight: 40,
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  mountAppCompletion();
  await nextTick();

  closeAllCompletions();
  await nextTick();

  expect(activeCompletion.value).toBeUndefined();
  expect(wrapper.exists()).toBe(true);
});

test('AppCompletion adds keyboard-anchored class for mobile input completion with keyboard', async () => {
  desktopBelow.value = true;
  keyboardOpened.value = true;
  keyboardHeight.value = 320;

  openCompletion({
    type: 'input',
    placeholder: 'Rename file',
  });

  mountAppCompletion();
  await nextTick();

  expect(wrapper.find('.completion-wrapper').classes()).toContain('keyboard-anchored');
});

test('AppCompletion does not add keyboard-anchored class without keyboard height', async () => {
  desktopBelow.value = true;
  keyboardOpened.value = true;
  keyboardHeight.value = 0;

  openCompletion({
    type: 'input',
    placeholder: 'Rename file',
  });

  mountAppCompletion();
  await nextTick();

  expect(wrapper.find('.completion-wrapper').classes()).not.toContain('keyboard-anchored');
});

test('AppCompletion does not add keyboard-anchored class for non-input completion', async () => {
  desktopBelow.value = true;
  keyboardOpened.value = true;
  keyboardHeight.value = 320;

  openCompletion({
    type: 'choice',
    placeholder: 'Pick a command',
    itemsGetter: () => ({
      result: [{ title: 'Test command', data: {}, commandHandler: vi.fn() }],
      total: 1,
    }),
  });

  mountAppCompletion();
  await nextTick();

  expect(wrapper.find('.completion-wrapper').classes()).not.toContain('keyboard-anchored');
});
