import { test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppTitle from './AppTitle.vue';

test('AppTitle renders h1 tag by default', () => {
  const wrapper = mount(AppTitle);
  expect(wrapper.element.tagName).toBe('H1');
  expect(wrapper.classes()).toContain('app-title');
  expect(wrapper.classes()).toContain('text-3xl');
});

test('AppTitle renders correct tag based on level prop', () => {
  const wrapper = mount(AppTitle, {
    props: {
      level: 3,
    },
  });
  expect(wrapper.element.tagName).toBe('H3');
  expect(wrapper.classes()).toContain('text-xl');
});

test('AppTitle applies correct size class based on size prop', () => {
  const wrapper = mount(AppTitle, {
    props: {
      size: 'sm',
    },
  });
  expect(wrapper.classes()).toContain('text-sm');
});

test('AppTitle overrides level-based size with size prop', () => {
  const wrapper = mount(AppTitle, {
    props: {
      level: 1,
      size: 'xs',
    },
  });
  expect(wrapper.classes()).toContain('text-xs');
  expect(wrapper.classes()).not.toContain('text-3xl');
});

test('AppTitle applies no-margin class when noMargin prop is true', () => {
  const wrapper = mount(AppTitle, {
    props: {
      noMargin: true,
    },
  });
  expect(wrapper.classes()).toContain('no-margin');
});

test('AppTitle renders slot content', () => {
  const wrapper = mount(AppTitle, {
    slots: {
      default: 'Hello World',
    },
  });
  expect(wrapper.text()).toBe('Hello World');
});
