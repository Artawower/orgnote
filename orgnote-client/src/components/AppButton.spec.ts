import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import AppButton from './AppButton.vue';

test('AppButton uses medium size by default', () => {
  const wrapper = mount(AppButton);

  expect(wrapper.classes()).toContain('button-md');
});

test.each(['xs', 'sm', 'md', 'lg'] as const)('AppButton exposes %s size class', (size) => {
  const wrapper = mount(AppButton, { props: { size } });

  expect(wrapper.classes()).toContain(`button-${size}`);
});
