import { mount } from '@vue/test-utils';
import { computed, reactive, ref } from 'vue';
import { test, expect, vi, beforeEach } from 'vitest';

const acceptAutocomplete = vi.fn();
let canAcceptAutocomplete = false;
let searchQuery = '';

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useCompletion: () =>
        reactive({
          activeCompletion: computed(() => ({ searchQuery })),
          canAcceptAutocomplete: vi.fn(() => canAcceptAutocomplete),
          acceptAutocomplete,
          close: vi.fn(),
        }),
    },
    ui: {
      useModal: () =>
        reactive({
          config: ref({ fullScreen: false }),
          updateConfig: vi.fn(),
        }),
    },
  },
}));

const mountCompletionInput = async () => {
  const { default: CompletionInput } = await import('./CompletionInput.vue');
  return mount(CompletionInput, {
    global: {
      stubs: {
        SearchInput: { template: '<div><slot name="actions" /></div>' },
        VisibilityWrapper: { template: '<div><slot /></div>' },
        ActionButton: {
          props: ['icon', 'ariaLabel'],
          emits: ['click'],
          template: '<button :aria-label="ariaLabel" @click="$emit(\'click\')">{{ icon }}</button>',
        },
      },
    },
  });
};

beforeEach(() => {
  acceptAutocomplete.mockClear();
  canAcceptAutocomplete = false;
  searchQuery = '';
});

test('CompletionInput hides autocomplete button when input-choice cannot accept', async () => {
  const wrapper = await mountCompletionInput();

  expect(wrapper.text()).not.toContain('keyboard_tab');
});

test('CompletionInput shows autocomplete button when input-choice can accept', async () => {
  canAcceptAutocomplete = true;

  const wrapper = await mountCompletionInput();

  expect(wrapper.text()).toContain('keyboard_tab');
});

test('CompletionInput autocomplete button accepts selected candidate', async () => {
  canAcceptAutocomplete = true;
  const wrapper = await mountCompletionInput();

  await wrapper.find('button[aria-label="Accept autocomplete"]').trigger('click');

  expect(acceptAutocomplete).toHaveBeenCalledOnce();
});
