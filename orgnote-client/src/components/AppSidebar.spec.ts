import { mount } from '@vue/test-utils';
import AppSidebar from './AppSidebar.vue';
import { test, expect } from 'vitest';

test('AppSidebar renders default slot content', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left' },
    slots: {
      default: '<div class="test-content">Sidebar content</div>',
    },
  });

  expect(wrapper.find('.test-content').text()).toBe('Sidebar content');
});

test('AppSidebar has app-sidebar class', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left' },
  });

  expect(wrapper.classes()).toContain('app-sidebar');
});

test('AppSidebar applies opened class when opened prop is true', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', opened: true },
  });

  expect(wrapper.classes()).toContain('opened');
});

test('AppSidebar does not apply opened class when opened prop is false', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', opened: false },
  });

  expect(wrapper.classes()).not.toContain('opened');
});

test('AppSidebar is opened by default', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left' },
  });

  expect(wrapper.classes()).toContain('opened');
});

test('AppSidebar renders mini section when mini prop is true', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', mini: true },
    slots: {
      'mini-top': '<div class="mini-top-content">Top</div>',
      'mini-footer': '<div class="mini-footer-content">Footer</div>',
    },
  });

  expect(wrapper.find('.mini-section').exists()).toBe(true);
  expect(wrapper.find('.mini-top-content').text()).toBe('Top');
  expect(wrapper.find('.mini-footer-content').text()).toBe('Footer');
});

test('AppSidebar does not render mini section when mini prop is false', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', mini: false },
  });

  expect(wrapper.find('.mini-section').exists()).toBe(false);
});

test('AppSidebar applies has-mini class when mini prop is true', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', mini: true },
  });

  expect(wrapper.classes()).toContain('has-mini');
});

test('AppSidebar wraps content in SafeArea with top inset', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left' },
  });
  const safeArea = wrapper.findComponent({ name: 'SafeArea' });

  expect(safeArea.exists()).toBe(true);
  expect(safeArea.props('top')).toBe(true);
});

test('AppSidebar applies left class when side is left', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left' },
  });

  expect(wrapper.classes()).toContain('left');
});

test('AppSidebar applies right class when side is right', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'right' },
  });

  expect(wrapper.classes()).toContain('right');
});

test('AppSidebar renders header slot when provided', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left' },
    slots: {
      header: '<div class="header-content">Header</div>',
    },
  });

  expect(wrapper.find('.header').exists()).toBe(true);
  expect(wrapper.find('.header-content').text()).toBe('Header');
});

test('AppSidebar renders footer slot when provided', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left' },
    slots: {
      footer: '<div class="footer-content">Footer</div>',
    },
  });

  expect(wrapper.find('.footer').exists()).toBe(true);
  expect(wrapper.find('.footer-content').text()).toBe('Footer');
});

test('AppSidebar renders resize splitter when resizable is true', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'right', resizable: true, width: 300 },
  });

  expect(wrapper.findComponent({ name: 'ResizeSplitter' }).exists()).toBe(true);
});

test('AppSidebar does not render resize splitter when resizable is false', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', resizable: false },
  });

  expect(wrapper.findComponent({ name: 'ResizeSplitter' }).exists()).toBe(false);
});

test('AppSidebar defaults side to left when not specified', () => {
  const wrapper = mount(AppSidebar);

  expect(wrapper.classes()).toContain('left');
});

test('AppSidebar hides resize splitter when opened is false', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', resizable: true, opened: false },
  });

  expect(wrapper.findComponent({ name: 'ResizeSplitter' }).exists()).toBe(false);
});

test('AppSidebar applies resizable class when resizable is true', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', resizable: true },
  });

  expect(wrapper.classes()).toContain('resizable');
});

test('AppSidebar does not apply resizable class when resizable is false', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', resizable: false },
  });

  expect(wrapper.classes()).not.toContain('resizable');
});

test('AppSidebar applies custom width style when resizable and width provided', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'right', resizable: true, width: 400 },
  });

  expect(wrapper.attributes('style')).toContain('--sidebar-content-width: 400px');
});

test('AppSidebar does not apply width style when not resizable', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', resizable: false, width: 400 },
  });

  expect(wrapper.attributes('style')).toBeUndefined();
});

test('AppSidebar does not apply width style when width is not provided', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', resizable: true },
  });

  expect(wrapper.attributes('style')).toBeUndefined();
});

test('AppSidebar renders all slots together correctly', () => {
  const wrapper = mount(AppSidebar, {
    props: { side: 'left', mini: true },
    slots: {
      'mini-top': '<div class="slot-mini-top">Mini Top</div>',
      'mini-footer': '<div class="slot-mini-footer">Mini Footer</div>',
      header: '<div class="slot-header">Header</div>',
      default: '<div class="slot-default">Content</div>',
      footer: '<div class="slot-footer">Footer</div>',
    },
  });

  expect(wrapper.find('.slot-mini-top').exists()).toBe(true);
  expect(wrapper.find('.slot-mini-footer').exists()).toBe(true);
  expect(wrapper.find('.slot-header').exists()).toBe(true);
  expect(wrapper.find('.slot-default').exists()).toBe(true);
  expect(wrapper.find('.slot-footer').exists()).toBe(true);
});
