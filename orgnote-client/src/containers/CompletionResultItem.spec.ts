import { mount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import { test, expect, vi, beforeEach } from 'vitest';
import type { Completion, CompletionCandidate, CompletionItemRenderer } from 'orgnote-api';

const acceptAutocomplete = vi.fn();
let activeCompletion: Completion | undefined;

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useCompletion: () =>
        reactive({
          activeCompletion,
          acceptAutocomplete,
        }),
    },
  },
}));

const itemRenderer = defineComponent({
  props: ['candidate'],
  template: '<span>{{ candidate.title }}</span>',
}) as CompletionItemRenderer;

const mountResultItem = async (
  candidate: CompletionCandidate,
  index: number = 0,
  selected: boolean = true,
) => {
  const { default: CompletionResultItem } = await import('./CompletionResultItem.vue');
  return mount(CompletionResultItem, {
    props: { item: candidate, index, selected },
  });
};

beforeEach(() => {
  acceptAutocomplete.mockClear();
  activeCompletion = undefined;
});

test('CompletionResultItem accepts autocomplete instead of executing input-choice candidate', async () => {
  const commandHandler = vi.fn();
  const candidate: CompletionCandidate = {
    title: '/notes/project.org',
    data: {},
    commandHandler,
  };
  activeCompletion = {
    type: 'input-choice',
    searchQuery: '/notes/pro',
    candidates: [candidate],
    selectedCandidateIndex: 0,
    itemRenderer,
    itemsGetter: () => ({ result: [], total: 0 }),
    result: Promise.resolve(),
  };

  const wrapper = await mountResultItem(candidate);
  await wrapper.find('.completion-item').trigger('click');

  expect(activeCompletion!.selectedCandidateIndex).toBe(0);
  expect(acceptAutocomplete).toHaveBeenCalledOnce();
  expect(commandHandler).not.toHaveBeenCalled();
});

test('CompletionResultItem changes selection on click but not hover', async () => {
  const firstCandidate: CompletionCandidate = {
    title: 'First',
    data: 1,
    commandHandler: vi.fn(),
  };
  const secondCandidate: CompletionCandidate = {
    title: 'Second',
    data: 2,
    commandHandler: vi.fn(),
  };
  activeCompletion = {
    type: 'choice',
    searchQuery: '',
    candidates: [firstCandidate, secondCandidate],
    selectedCandidateIndex: 0,
    itemRenderer,
    itemsGetter: () => ({ result: [], total: 0 }),
    result: Promise.resolve(),
  };
  const wrapper = await mountResultItem(secondCandidate, 1, false);
  const item = wrapper.find('.completion-item');

  await item.trigger('mouseover', { clientX: 10, clientY: 10 });
  expect(activeCompletion.selectedCandidateIndex).toBe(0);

  await item.trigger('click');
  expect(activeCompletion.selectedCandidateIndex).toBe(1);
  expect(secondCandidate.commandHandler).toHaveBeenCalledWith(secondCandidate.data);
});

test('CompletionResultItem executes choice candidate on click', async () => {
  const commandHandler = vi.fn();
  const candidate: CompletionCandidate = {
    title: 'copy CLI install command',
    data: { command: 'copy-cli-install-command' },
    commandHandler,
  };
  activeCompletion = {
    type: 'choice',
    searchQuery: 'cli',
    candidates: [candidate],
    selectedCandidateIndex: 0,
    itemRenderer,
    itemsGetter: () => ({ result: [], total: 0 }),
    result: Promise.resolve(),
  };

  const wrapper = await mountResultItem(candidate);
  await wrapper.find('.completion-item').trigger('click');

  expect(commandHandler).toHaveBeenCalledWith(candidate.data);
  expect(acceptAutocomplete).not.toHaveBeenCalled();
});
