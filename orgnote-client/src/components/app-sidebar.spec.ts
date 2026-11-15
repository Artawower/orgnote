import { test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppSidebar from './AppSidebar.vue';
import { nextTick } from 'vue';

test('AppSidebar renders slots correctly', () => {
  const wrapper = mount(AppSidebar, {
    props: {
      side: 'left',
      opened: true,
      mini: true,
    },
    slots: {
      default: '<div>Default Content</div>',
      'mini-footer': '<div>Footer Content</div>',
      'mini-top': '<h1>TOP</h1>',
    },
  });

  expect(wrapper.text()).toContain('Default Content');
  expect(wrapper.text()).toContain('Footer Content');
});

test('AppSidebar applies mini-section when the mini prop is true', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', mini: true },
  });

  expect(wrapper.find('.mini-section').exists()).toBe(true);
});

test('AppSidebar does not render mini-section when mini prop is false', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', mini: false },
  });

  expect(wrapper.find('.mini-section').exists()).toBe(false);
});

test('AppSidebar applies the correct class based on opened prop', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', opened: true },
  });

  expect(wrapper.find('.app-sidebar').classes()).toContain('opened');
});

test('AppSidebar does not apply opened class when prop is false', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', opened: false },
  });

  expect(wrapper.find('.app-sidebar').classes()).not.toContain('opened');
});

test('AppSidebar renders content section when opened is true', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', opened: true },
  });

  expect(wrapper.find('.content').exists()).toBe(true);
});

test('AppSidebar adds or removes opened class based on prop', async () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', opened: true },
  });

  expect(wrapper.find('.app-sidebar').classes()).toContain('opened');

  await wrapper.setProps({ opened: false });
  await nextTick();

  expect(wrapper.find('.app-sidebar').classes()).not.toContain('opened');
});

test.skip('AppSidebar content section is hidden when opened is false', async () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', opened: false },
  });

  await nextTick();
  expect(wrapper.find('.content').exists()).toBe(true);
  const content = wrapper.find('.content').element;
  const computedStyle = getComputedStyle(content);

  expect(computedStyle.width).toBe('0px');
});

test('AppSidebar does not render mini slots when mini is false', () => {
  const wrapper = mount(AppSidebar, {
    props: {
      side: 'left',
      opened: true,
      mini: false,
    },
    slots: {
      default: '<div>Default Content</div>',
      'mini-footer': '<div>Footer Content</div>',
      'mini-top': '<h1>TOP</h1>',
    },
  });

  expect(wrapper.text()).toContain('Default Content');
  expect(wrapper.text()).not.toContain('Footer Content');
  expect(wrapper.text()).not.toContain('TOP');
});

test('AppSidebar applies left class when side is left', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left' },
  });

  expect(wrapper.find('.app-sidebar').classes()).toContain('left');
});

test('AppSidebar applies right class when side is right', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'right' },
  });

  expect(wrapper.find('.app-sidebar').classes()).toContain('right');
});
