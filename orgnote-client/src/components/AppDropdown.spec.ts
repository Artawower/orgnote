import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import AppDropdown from './AppDropdown.vue';

const OPTIONS = ['Apple', 'Banana', 'Cherry'];

test('AppDropdown renders a selected single value', () => {
  const wrapper = mount(AppDropdown, {
    props: {
      options: OPTIONS,
      modelValue: 'Apple',
    },
  });

  expect(wrapper.get('.vs__selected').text()).toBe('Apple');
  expect(wrapper.find('.clear-button').exists()).toBe(true);
});

test('AppDropdown clears a selected single value', async () => {
  const wrapper = mount(AppDropdown, {
    props: {
      options: OPTIONS,
      modelValue: 'Apple',
    },
  });

  await wrapper.get('.clear-button').trigger('click');

  expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
});

test('AppDropdown renders multiple selected values', () => {
  const wrapper = mount(AppDropdown, {
    props: {
      options: OPTIONS,
      modelValue: ['Apple', 'Banana'],
      multiple: true,
    },
  });

  expect(wrapper.findAll('.vs__selected').map((selected) => selected.text())).toEqual([
    'Apple',
    'Banana',
  ]);
});

test('AppDropdown clears multiple selected values', async () => {
  const wrapper = mount(AppDropdown, {
    props: {
      options: OPTIONS,
      modelValue: ['Apple', 'Banana'],
      multiple: true,
    },
  });

  await wrapper.get('.clear-button').trigger('click');

  expect(wrapper.emitted('update:modelValue')).toEqual([[[]]]);
});

test('AppDropdown renders the dropdown indicator when clearing is disabled', () => {
  const wrapper = mount(AppDropdown, {
    props: {
      options: OPTIONS,
      modelValue: 'Apple',
      clearable: false,
    },
  });

  expect(wrapper.find('.clear-button').exists()).toBe(false);
  expect(wrapper.find('.dropdown-indicator').exists()).toBe(true);
});
