import { mount, type VueWrapper } from '@vue/test-utils';
import PageWrapper from './PageWrapper.vue';
import { test, expect } from 'vitest';

const getContentFrameClasses = (wrapper: VueWrapper): string[] =>
  wrapper.get('.content-frame').classes();

const getContentFrameLayoutClasses = (wrapper: VueWrapper): string[] =>
  wrapper.get('.content-frame .flex-container').classes();

test('PageWrapper should render slot content', () => {
  const wrapper = mount(PageWrapper, {
    slots: {
      default: '<div class="test-content">Page content</div>',
    },
  });

  expect(wrapper.find('.test-content').exists()).toBe(true);
  expect(wrapper.find('.test-content').text()).toBe('Page content');
});

test('PageWrapper should apply padding class when padding prop is true', () => {
  const wrapper = mount(PageWrapper, {
    props: {
      padding: true,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  expect(getContentFrameClasses(wrapper)).toContain('padding');
});

test('PageWrapper should not apply padding class when padding prop is false', () => {
  const wrapper = mount(PageWrapper, {
    props: {
      padding: false,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  expect(getContentFrameClasses(wrapper)).not.toContain('padding');
});

test('PageWrapper should not apply padding class by default', () => {
  const wrapper = mount(PageWrapper, {
    slots: {
      default: '<div>Content</div>',
    },
  });

  expect(getContentFrameClasses(wrapper)).not.toContain('padding');
});

test('PageWrapper should apply constrained class when constrained prop is true', () => {
  const wrapper = mount(PageWrapper, {
    props: {
      constrained: true,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  expect(getContentFrameClasses(wrapper)).toContain('constrained');
});

test('PageWrapper should not apply constrained class when constrained prop is false', () => {
  const wrapper = mount(PageWrapper, {
    props: {
      constrained: false,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  expect(getContentFrameClasses(wrapper)).not.toContain('constrained');
});

test('PageWrapper should not apply constrained class by default', () => {
  const wrapper = mount(PageWrapper, {
    slots: {
      default: '<div>Content</div>',
    },
  });

  expect(getContentFrameClasses(wrapper)).not.toContain('constrained');
});

test('PageWrapper should apply both padding and constrained classes when both props are true', () => {
  const wrapper = mount(PageWrapper, {
    props: {
      padding: true,
      constrained: true,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  const contentFrameClasses = getContentFrameClasses(wrapper);
  expect(contentFrameClasses).toContain('padding');
  expect(contentFrameClasses).toContain('constrained');
});

test('PageWrapper should apply only padding when constrained is false', () => {
  const wrapper = mount(PageWrapper, {
    props: {
      padding: true,
      constrained: false,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  const contentFrameClasses = getContentFrameClasses(wrapper);
  expect(contentFrameClasses).toContain('padding');
  expect(contentFrameClasses).not.toContain('constrained');
});

test('PageWrapper should apply only constrained when padding is false', () => {
  const wrapper = mount(PageWrapper, {
    props: {
      padding: false,
      constrained: true,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  const contentFrameClasses = getContentFrameClasses(wrapper);
  expect(contentFrameClasses).not.toContain('padding');
  expect(contentFrameClasses).toContain('constrained');
});

test('PageWrapper should keep page wrapper separate from content frame layout', () => {
  const wrapper = mount(PageWrapper, {
    slots: {
      default: '<div>Content</div>',
    },
  });

  const pageClasses = wrapper.find('.page').classes();
  const contentFrameClasses = getContentFrameClasses(wrapper);
  const layoutClasses = getContentFrameLayoutClasses(wrapper);

  expect(pageClasses).toContain('page');
  expect(pageClasses).toContain('page-container');
  expect(pageClasses).not.toContain('flex-container');
  expect(pageClasses).not.toContain('padding');
  expect(pageClasses).not.toContain('constrained');
  expect(contentFrameClasses).not.toContain('flex-container');
  expect(layoutClasses).toContain('flex-container');
  expect(layoutClasses).toContain('d-column');
  expect(layoutClasses).toContain('j-between');
  expect(layoutClasses).toContain('a-stretch');
});

test('PageWrapper should center content through content frame layout', () => {
  const wrapper = mount(PageWrapper, {
    props: {
      centered: true,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  const layoutClasses = getContentFrameLayoutClasses(wrapper);

  expect(layoutClasses).toContain('j-center');
  expect(layoutClasses).toContain('a-center');
});

test('PageWrapper should handle empty slot content', () => {
  const wrapper = mount(PageWrapper, {
    slots: {
      default: '',
    },
  });

  expect(wrapper.find('.page').exists()).toBe(true);
  expect(wrapper.find('.page').text()).toBe('');
});

test('PageWrapper should handle multiple child elements in slot', () => {
  const wrapper = mount(PageWrapper, {
    slots: {
      default: `
        <div class="child1">Child 1</div>
        <div class="child2">Child 2</div>
        <div class="child3">Child 3</div>
      `,
    },
  });

  expect(wrapper.find('.child1').exists()).toBe(true);
  expect(wrapper.find('.child2').exists()).toBe(true);
  expect(wrapper.find('.child3').exists()).toBe(true);
});

test('PageWrapper should maintain page class regardless of props', () => {
  const wrappers = [
    mount(PageWrapper, { props: { padding: true } }),
    mount(PageWrapper, { props: { constrained: true } }),
    mount(PageWrapper, { props: { padding: true, constrained: true } }),
    mount(PageWrapper),
  ];

  wrappers.forEach((wrapper) => {
    expect(wrapper.find('.page').exists()).toBe(true);
  });
});

test('PageWrapper should update classes when props change', async () => {
  const wrapper = mount(PageWrapper, {
    props: {
      padding: false,
      constrained: false,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  expect(getContentFrameClasses(wrapper)).not.toContain('padding');
  expect(getContentFrameClasses(wrapper)).not.toContain('constrained');

  const setPageWrapperProps = wrapper.setProps.bind(wrapper) as (props: {
    padding?: boolean;
    constrained?: boolean;
  }) => Promise<void>;
  await setPageWrapperProps({ padding: true });
  expect(getContentFrameClasses(wrapper)).toContain('padding');

  await setPageWrapperProps({ constrained: true });
  expect(getContentFrameClasses(wrapper)).toContain('constrained');

  await setPageWrapperProps({ padding: false, constrained: false });
  expect(getContentFrameClasses(wrapper)).not.toContain('padding');
  expect(getContentFrameClasses(wrapper)).not.toContain('constrained');
});

test('PageWrapper should handle boolean prop edge cases', async () => {
  const wrapper = mount(PageWrapper, {
    props: {
      padding: undefined,
      constrained: undefined,
    },
    slots: {
      default: '<div>Content</div>',
    },
  });

  expect(getContentFrameClasses(wrapper)).not.toContain('padding');
  expect(getContentFrameClasses(wrapper)).not.toContain('constrained');
});
