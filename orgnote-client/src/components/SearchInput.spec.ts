import { mount } from '@vue/test-utils';
import { test, expect, vi } from 'vitest';
import type * as VueI18n from 'vue-i18n';
import SearchInput from './SearchInput.vue';

const { mockTranslate } = vi.hoisted(() => ({
  mockTranslate: vi.fn((key: string) => key),
}));

vi.mock('vue-i18n', async () => {
  const actual = (await vi.importActual('vue-i18n')) as typeof VueI18n;

  return {
    ...actual,
    useI18n: () => ({
      t: mockTranslate,
      te: vi.fn(() => true),
    }),
  };
});

test('SearchInput renders input element', () => {
  const wrapper = mount(SearchInput);

  expect(wrapper.find('input').exists()).toBe(true);
});

test('SearchInput applies flat appearance class by default', () => {
  const wrapper = mount(SearchInput);

  expect(wrapper.find('.search-input').classes()).toContain('flat');
});

test('SearchInput applies glass appearance class when appearance is glass', () => {
  const wrapper = mount(SearchInput, {
    props: { appearance: 'glass' },
  });

  expect(wrapper.find('.search-input').classes()).toContain('glass');
});

test('SearchInput applies field appearance class when appearance is field', () => {
  const wrapper = mount(SearchInput, {
    props: { appearance: 'field' },
  });

  expect(wrapper.find('.search-input').classes()).toContain('field');
});

test('SearchInput renders icon when icon prop is provided', () => {
  const wrapper = mount(SearchInput, {
    props: { icon: 'search' },
  });

  expect(wrapper.find('.search-icon').exists()).toBe(true);
});

test('SearchInput does not render icon when icon prop is not provided', () => {
  const wrapper = mount(SearchInput);

  expect(wrapper.find('.search-icon').exists()).toBe(false);
});

test('SearchInput shows clear button when clearable and model has value', async () => {
  const wrapper = mount(SearchInput, {
    props: {
      clearable: true,
      modelValue: 'test',
    },
  });
  const clearButton = wrapper.findComponent({ name: 'ActionButton' });

  expect(clearButton.exists()).toBe(true);
});

test('SearchInput does not render the clear button when model is empty', () => {
  const wrapper = mount(SearchInput, {
    props: {
      clearable: true,
      modelValue: '',
    },
  });

  expect(wrapper.findComponent({ name: 'ActionButton' }).exists()).toBe(false);
});

test('SearchInput hides clear button when clearable is false', () => {
  const wrapper = mount(SearchInput, {
    props: {
      clearable: false,
      modelValue: 'test',
    },
  });

  expect(wrapper.findComponent({ name: 'ActionButton' }).exists()).toBe(false);
});

test('SearchInput clears model value when clear button is clicked', async () => {
  const onUpdate = vi.fn();
  const wrapper = mount(SearchInput, {
    props: {
      clearable: true,
      modelValue: 'test',
      'onUpdate:modelValue': onUpdate,
    },
  });

  await wrapper.findComponent({ name: 'ActionButton' }).trigger('click');
  expect(onUpdate).toHaveBeenCalledWith('');
});

test('SearchInput renders actions slot content', () => {
  const wrapper = mount(SearchInput, {
    slots: {
      actions: '<button class="custom-action">Action</button>',
    },
  });

  expect(wrapper.find('.custom-action').exists()).toBe(true);
});

test('SearchInput translates placeholder via i18n', () => {
  mount(SearchInput, {
    props: { placeholder: 'search.placeholder' },
  });

  expect(mockTranslate).toHaveBeenCalledWith('search.placeholder');
});

test('SearchInput exposes focus method', () => {
  const wrapper = mount(SearchInput);

  expect(wrapper.vm.focus).toBeDefined();
  expect(typeof wrapper.vm.focus).toBe('function');
});
