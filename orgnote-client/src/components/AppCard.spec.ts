import { mount } from '@vue/test-utils';
import AppCard from './AppCard.vue';
import { test, expect } from 'vitest';

test('AppCard should render default slot content', () => {
  const wrapper = mount(AppCard, {
    slots: {
      default: '<div class="test-content">Card content</div>',
    },
  });

  expect(wrapper.find('.test-content').text()).toBe('Card content');
});

test('AppCard should render cardTitle slot when provided', () => {
  const wrapper = mount(AppCard, {
    slots: {
      cardTitle: 'My Title',
      default: 'Content',
    },
  });

  expect(wrapper.find('.card-title').text()).toContain('My Title');
});

test('AppCard should render cardTitle slot for any type', () => {
  const types = ['plain', 'info', 'warning', 'danger'] as const;

  types.forEach((type) => {
    const wrapper = mount(AppCard, {
      props: { type },
      slots: {
        cardTitle: 'Title',
        default: 'Content',
      },
    });

    expect(wrapper.find('.card-title').text()).toContain('Title');
  });
});

test('AppCard should apply type prop to CardWrapper component', () => {
  const types = ['plain', 'info', 'warning', 'danger'] as const;

  types.forEach((type) => {
    const wrapper = mount(AppCard, {
      props: { type },
      slots: { default: 'Content' },
    });

    const cardWrapper = wrapper.findComponent({ name: 'CardWrapper' });
    expect(cardWrapper.props('type')).toBe(type);
  });
});

test('AppCard should show default info icon when type is info', () => {
  const wrapper = mount(AppCard, {
    props: { type: 'info' },
    slots: {
      cardTitle: 'Title',
      default: 'Content',
    },
  });

  const icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.exists()).toBe(true);
  expect(icon.props('name')).toBe('sym_o_info');
  expect(icon.props('color')).toBe('blue');
});

test('AppCard should show default warning icon when type is warning', () => {
  const wrapper = mount(AppCard, {
    props: { type: 'warning' },
    slots: {
      cardTitle: 'Title',
      default: 'Content',
    },
  });

  const icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.exists()).toBe(true);
  expect(icon.props('name')).toBe('sym_o_warning');
  expect(icon.props('color')).toBe('yellow');
});

test('AppCard should show default danger icon when type is danger', () => {
  const wrapper = mount(AppCard, {
    props: { type: 'danger' },
    slots: {
      cardTitle: 'Title',
      default: 'Content',
    },
  });

  const icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.exists()).toBe(true);
  expect(icon.props('name')).toBe('sym_o_dangerous');
  expect(icon.props('color')).toBe('red');
});

test('AppCard should not show icon when shouldShowIcon is false', () => {
  const wrapper = mount(AppCard, {
    props: { type: 'plain' },
    slots: {
      cardTitle: 'Title',
      default: 'Content',
    },
  });

  const icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.exists()).toBe(false);
});

test('AppCard should show custom icon when icon prop is provided', () => {
  const wrapper = mount(AppCard, {
    props: {
      type: 'info',
      icon: 'sym_o_custom',
    },
    slots: {
      cardTitle: 'Title',
      default: 'Content',
    },
  });

  const icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.exists()).toBe(true);
  expect(icon.props('name')).toBe('sym_o_custom');
});

test('AppCard should show custom icon for each type when icon prop is provided', () => {
  const types = ['plain', 'info', 'warning', 'danger'] as const;

  types.forEach((type) => {
    const wrapper = mount(AppCard, {
      props: {
        type,
        icon: 'sym_o_custom',
      },
      slots: {
        cardTitle: 'Title',
        default: 'Content',
      },
    });

    const icon = wrapper.findComponent({ name: 'AppIcon' });
    expect(icon.exists()).toBe(true);
    expect(icon.props('name')).toBe('sym_o_custom');
  });
});

test('AppCard should prioritize custom icon over default type icon', () => {
  const wrapper = mount(AppCard, {
    props: {
      type: 'warning',
      icon: 'sym_o_override',
    },
    slots: {
      cardTitle: 'Title',
      default: 'Content',
    },
  });

  const icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.props('name')).toBe('sym_o_override');
});

test('AppCard should apply color style to card title based on type', () => {
  const wrapper = mount(AppCard, {
    props: { type: 'info' },
    slots: {
      cardTitle: 'Title',
      default: 'Content',
    },
  });

  const title = wrapper.find('.card-title');
  expect(title.attributes('style')).toContain('color: var(--blue)');
});

test('AppCard should use plain type by default', () => {
  const wrapper = mount(AppCard, {
    slots: {
      default: 'Content',
    },
  });

  const cardWrapper = wrapper.findComponent({ name: 'CardWrapper' });
  expect(cardWrapper.props('type')).toBe('plain');
});

test('AppCard should not show card header when no cardTitle and shouldShowIcon is false', () => {
  const wrapper = mount(AppCard, {
    props: { type: 'plain' },
    slots: {
      default: 'Content',
    },
  });

  expect(wrapper.find('.card-header').exists()).toBe(false);
});

  test('AppCard should not show card header when shouldShowIcon is true but no title is provided', () => {
    const types = ['info', 'warning', 'danger'] as const;

    types.forEach((type) => {
      const wrapper = mount(AppCard, {
        props: { type },
        slots: {
          default: 'Content',
        },
      });

      expect(wrapper.find('.card-header').exists()).toBe(false);
      expect(wrapper.findComponent({ name: 'AppIcon' }).exists()).toBe(true);
    });
  });

test('AppCard should show card header when cardTitle is provided', () => {
  const wrapper = mount(AppCard, {
    props: { type: 'plain' },
    slots: {
      cardTitle: 'Title',
      default: 'Content',
    },
  });

  expect(wrapper.find('.card-header').exists()).toBe(true);
});

test('AppCard should not show card header when custom icon is provided but no title', () => {
  const wrapper = mount(AppCard, {
    props: {
      type: 'plain',
      icon: 'sym_o_star',
    },
    slots: {
      default: 'Content',
    },
  });

  expect(wrapper.find('.card-header').exists()).toBe(false);
  expect(wrapper.findComponent({ name: 'AppIcon' }).exists()).toBe(true);
});
