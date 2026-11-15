import { mount } from '@vue/test-utils';
import AppIcon from './AppIcon.vue';
import { test, expect } from 'vitest';

test('AppIcon should have rounded class when rounded prop is true', () => {
  const wrapper = mount(AppIcon, {
    props: {
      name: 'sym_o_star',
      rounded: true,
    },
  });

  expect(wrapper.find('.icon').classes()).toContain('rounded');
});

test('AppIcon should have bordered class when bordered prop is true', () => {
  const wrapper = mount(AppIcon, {
    props: {
      name: 'sym_o_info',
      bordered: true,
    },
  });

  expect(wrapper.find('.icon').classes()).toContain('bordered');
});

test('AppIcon should have both rounded and bordered classes when both props are true', () => {
  const wrapper = mount(AppIcon, {
    props: {
      name: 'sym_o_settings',
      rounded: true,
      bordered: true,
    },
  });

  const icon = wrapper.find('.icon');
  expect(icon.classes()).toContain('rounded');
  expect(icon.classes()).toContain('bordered');
});

test('AppIcon should apply color style when color prop is provided', () => {
  const wrapper = mount(AppIcon, {
    props: {
      name: 'sym_o_home',
      color: 'blue',
    },
  });

  const icon = wrapper.find('.icon');
  expect(icon.attributes('style')).toContain('color: var(--blue)');
});

test('AppIcon should apply background style when background prop is provided', () => {
  const wrapper = mount(AppIcon, {
    props: {
      name: 'sym_o_home',
      background: 'red',
    },
  });

  const icon = wrapper.find('.icon');
  expect(icon.attributes('style')).toContain('background-color: var(--red)');
});

test('AppIcon should apply both color and background styles when both props are provided', () => {
  const wrapper = mount(AppIcon, {
    props: {
      name: 'sym_o_home',
      color: 'blue',
      background: 'yellow',
    },
  });

  const icon = wrapper.find('.icon');
  const style = icon.attributes('style');
  expect(style).toContain('color: var(--blue)');
  expect(style).toContain('background-color: var(--yellow)');
});

test('AppIcon should apply size class for predefined size variants', () => {
  const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

  sizes.forEach((size) => {
    const wrapper = mount(AppIcon, {
      props: {
        name: 'sym_o_home',
        size,
      },
    });

    expect(wrapper.find('.icon').classes()).toContain(`icon-${size}`);
  });
});

test('AppIcon should use md size by default', () => {
  const wrapper = mount(AppIcon, {
    props: {
      name: 'sym_o_home',
    },
  });

  expect(wrapper.find('.icon').classes()).toContain('icon-md');
});
