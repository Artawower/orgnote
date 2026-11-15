import { mount } from '@vue/test-utils';
import ContainerLayout from './ContainerLayout.vue';
import { test, expect } from 'vitest';

test('ContainerLayout should render body slot content', () => {
  const wrapper = mount(ContainerLayout, {
    slots: {
      body: '<div class="test-body">Body Content</div>',
    },
  });

  expect(wrapper.find('.test-body').text()).toBe('Body Content');
});

test('ContainerLayout should render default slot content in body', () => {
  const wrapper = mount(ContainerLayout, {
    slots: {
      default: '<div class="test-default">Default Content</div>',
    },
  });

  expect(wrapper.find('.test-default').text()).toBe('Default Content');
});

test('ContainerLayout should render header and footer slots when provided', () => {
  const wrapper = mount(ContainerLayout, {
    slots: {
      header: 'Header',
      body: 'Body',
      footer: 'Footer',
    },
  });

  expect(wrapper.text()).toContain('Header');
  expect(wrapper.text()).toContain('Body');
  expect(wrapper.text()).toContain('Footer');
});

test('ContainerLayout should not render header when header slot is not provided', () => {
  const wrapper = mount(ContainerLayout, {
    slots: {
      body: 'Body',
    },
  });

  expect(wrapper.find('.layout-header').exists()).toBe(false);
});

test('ContainerLayout should not render footer when footer slot is not provided', () => {
  const wrapper = mount(ContainerLayout, {
    slots: {
      body: 'Body',
    },
  });

  expect(wrapper.find('.layout-footer').exists()).toBe(false);
});

test('ContainerLayout should have scroll class when bodyScroll prop is true', () => {
  const wrapper = mount(ContainerLayout, {
    props: { bodyScroll: true },
    slots: { body: 'Content' },
  });

  expect(wrapper.find('.layout-body').classes()).toContain('scroll');
});

test('ContainerLayout should not have scroll class when bodyScroll prop is false', () => {
  const wrapper = mount(ContainerLayout, {
    props: { bodyScroll: false },
    slots: { body: 'Content' },
  });

  expect(wrapper.find('.layout-body').classes()).not.toContain('scroll');
});

test('ContainerLayout should reserve a stable scrollbar gutter when requested', () => {
  const wrapper = mount(ContainerLayout, {
    props: { bodyScroll: true, stableScrollbar: true },
    slots: { body: 'Content' },
  });

  expect(wrapper.find('.layout-body').classes()).toContain('stable-scrollbar');
});

test('ContainerLayout should apply gap style when gap prop is provided', () => {
  const wrapper = mount(ContainerLayout, {
    props: { gap: 'md' },
    slots: { body: 'Content' },
  });

  const layout = wrapper.find('.layout');
  expect(layout.attributes('style')).toContain('gap: var(--gap-md)');
});

test('ContainerLayout should apply gap style for each size variant', () => {
  const sizes = ['xs', 'sm', 'md', 'lg'] as const;

  sizes.forEach((size) => {
    const wrapper = mount(ContainerLayout, {
      props: { gap: size },
      slots: { body: 'Content' },
    });

    const layout = wrapper.find('.layout');
    expect(layout.attributes('style')).toContain(`gap: var(--gap-${size})`);
  });
});

test('ContainerLayout should render without gap prop', () => {
  const wrapper = mount(ContainerLayout, {
    slots: { body: 'Content' },
  });

  const layout = wrapper.find('.layout');
  expect(layout.exists()).toBe(true);
});

test('ContainerLayout should have reverse class when reverse prop is true', () => {
  const wrapper = mount(ContainerLayout, {
    props: { reverse: true },
    slots: {
      header: 'Header',
      body: 'Body',
      footer: 'Footer',
    },
  });

  expect(wrapper.find('.layout').classes()).toContain('reverse');
});

test('ContainerLayout should not have reverse class when reverse prop is false', () => {
  const wrapper = mount(ContainerLayout, {
    props: { reverse: false },
    slots: { body: 'Content' },
  });

  expect(wrapper.find('.layout').classes()).not.toContain('reverse');
});

test('ContainerLayout should have border class on header when headerBorder is true', () => {
  const wrapper = mount(ContainerLayout, {
    props: { headerBorder: true },
    slots: {
      header: 'Header',
      body: 'Body',
    },
  });

  expect(wrapper.find('.layout-header').classes()).toContain('border');
});

test('ContainerLayout should not have border class on header when headerBorder is false', () => {
  const wrapper = mount(ContainerLayout, {
    props: { headerBorder: false },
    slots: {
      header: 'Header',
      body: 'Body',
    },
  });

  expect(wrapper.find('.layout-header').classes()).not.toContain('border');
});

test('ContainerLayout should have border class on footer when footerBorder is true', () => {
  const wrapper = mount(ContainerLayout, {
    props: { footerBorder: true },
    slots: {
      body: 'Body',
      footer: 'Footer',
    },
  });

  expect(wrapper.find('.layout-footer').classes()).toContain('border');
});

test('ContainerLayout should not have border class on footer when footerBorder is false', () => {
  const wrapper = mount(ContainerLayout, {
    props: { footerBorder: false },
    slots: {
      body: 'Body',
      footer: 'Footer',
    },
  });

  expect(wrapper.find('.layout-footer').classes()).not.toContain('border');
});

test('ContainerLayout should apply all props together', () => {
  const wrapper = mount(ContainerLayout, {
    props: {
      gap: 'lg',
      bodyScroll: true,
      reverse: true,
      headerBorder: true,
      footerBorder: true,
    },
    slots: {
      header: 'Header',
      body: 'Body',
      footer: 'Footer',
    },
  });

  const layout = wrapper.find('.layout');
  expect(layout.attributes('style')).toContain('gap: var(--gap-lg)');
  expect(layout.classes()).toContain('reverse');
  expect(wrapper.find('.layout-header').classes()).toContain('border');
  expect(wrapper.find('.layout-footer').classes()).toContain('border');
  expect(wrapper.find('.layout-body').classes()).toContain('scroll');
});

test('ContainerLayout should have default values when no props provided', () => {
  const wrapper = mount(ContainerLayout, {
    slots: { body: 'Content' },
  });

  const layout = wrapper.find('.layout');
  expect(layout.classes()).not.toContain('reverse');
  expect(wrapper.find('.layout-body').classes()).toContain('scroll');
});

test('ContainerLayout should change border position when reverse is true', () => {
  const wrapper = mount(ContainerLayout, {
    props: {
      reverse: true,
      headerBorder: true,
      footerBorder: true,
    },
    slots: {
      header: 'Header',
      body: 'Body',
      footer: 'Footer',
    },
  });

  const header = wrapper.find('.layout-header');
  const footer = wrapper.find('.layout-footer');
  
  expect(header.classes()).toContain('border');
  expect(footer.classes()).toContain('border');
  expect(wrapper.find('.layout').classes()).toContain('reverse');
});

test('ContainerLayout should apply bodyScroll false without other props', () => {
  const wrapper = mount(ContainerLayout, {
    props: { bodyScroll: false },
    slots: { body: 'Content' },
  });

  expect(wrapper.find('.layout-body').classes()).not.toContain('scroll');
  expect(wrapper.find('.layout').classes()).not.toContain('reverse');
});

test('ContainerLayout should handle undefined gap gracefully', () => {
  const wrapper = mount(ContainerLayout, {
    props: { gap: undefined },
    slots: { body: 'Content' },
  });

  expect(wrapper.find('.layout').exists()).toBe(true);
});
