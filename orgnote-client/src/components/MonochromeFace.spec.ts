import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import MonochromeFace from './MonochromeFace.vue';

const createWrapper = (slots = { default: 'Content' }) =>
  mount(MonochromeFace, {
    slots,
  });

test('MonochromeFace renders slot content', () => {
  const wrapper = createWrapper();
  expect(wrapper.text()).toBe('Content');
});

test('MonochromeFace applies correct class', () => {
  const wrapper = createWrapper();
  expect(wrapper.find('.monochrome-face').exists()).toBe(true);
});
