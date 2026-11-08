import { mount } from '@vue/test-utils';
import { describe, test, expect, vi } from 'vitest';
import { ref } from 'vue';

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useModal: () => ({ config: ref(null) }),
      useScreenDetection: () => ({ desktopBelow: ref(false) }),
      useKeyboardState: () => ({ keyboardOpened: ref(false), keyboardHeight: ref(0) }),
    },
    core: {
      useCompletion: () => ({
        activeCompletion: ref({
          candidates: [],
          total: 0,
          selectedCandidateIndex: 0,
          type: 'choice',
          itemHeight: 64,
        }),
        isLoading: ref(true),
      }),
      useFileSearch: () => ({
        isIndexing: ref(false),
        isSearching: ref(false),
      }),
      useKeybindings: vi.fn(() => ({
        pushContext: vi.fn(() => vi.fn()),
        popContext: vi.fn(),
      })),
    },
  },
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

vi.mock('src/constants/completion-item', () => ({
  DEFAULT_COMPLETION_ITEM_HEIGHT: 64,
}));

describe('AppCompletion', () => {
  test('shows loading indicator instead of NOT_FOUND when isSearching', async () => {
    const { default: AppCompletion } = await import('./AppCompletion.vue');
    const wrapper = mount(AppCompletion, {
      props: {},
      global: {
        stubs: {
          ContainerLayout: { template: '<div><slot name="body" /></div>' },
          AppFlex: { template: '<div><slot /></div>' },
          CompletionInput: true,
          CompletionResult: true,
        },
      },
    });

    expect(wrapper.find('[data-testid="completion-loading"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('NOT_FOUND');
  });
});
