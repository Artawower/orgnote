import { mount } from '@vue/test-utils';
import { test, expect } from 'vitest';
import ToggleButton from './ToggleButton.vue';

test('renders the switch component with default props', () => {
  const wrapper = mount(ToggleButton);

  const input = wrapper.find('input');
  const label = wrapper.find('label');

  expect(input.exists()).toBe(true);
  expect(input.attributes('type')).toBe('checkbox');
  expect(label.exists()).toBe(true);
  expect(label.attributes('for')).toBe(input.attributes('id'));
});

test('renders the switch component with "flat" type by default', () => {
  const wrapper = mount(ToggleButton);

  const input = wrapper.find('input');

  expect(input.exists()).toBe(true);
});

test('binds the v-model correctly', async () => {
  const wrapper = mount(ToggleButton, {
    props: { modelValue: false },
  });

  const input = wrapper.find('input');

  expect((input.element as HTMLInputElement).checked).toBe(false);

  await input.setValue(true);
  expect((input.element as HTMLInputElement).checked).toBe(true);
});
