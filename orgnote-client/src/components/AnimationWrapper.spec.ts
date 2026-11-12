import { mount } from '@vue/test-utils';
import AnimationWrapper from './AnimationWrapper.vue';
import { test, expect, vi, beforeEach } from 'vitest';

const mockConfig = {
  ui: {
    enableAnimations: true,
  },
};

vi.mock('src/stores/config', () => ({
  useConfigStore: vi.fn(() => ({
    config: mockConfig,
  })),
}));

beforeEach(() => {
  mockConfig.ui.enableAnimations = true;
  vi.clearAllMocks();
});

test('AnimationWrapper should render slot content', () => {
  const wrapper = mount(AnimationWrapper, {
    slots: {
      default: '<div class="test-content">Content</div>',
    },
  });

  expect(wrapper.find('.test-content').text()).toBe('Content');
});

test('AnimationWrapper should apply animation name when enableAnimations is true', () => {
  const wrapper = mount(AnimationWrapper, {
    props: { animationName: 'bounce' },
    slots: { default: '<div>Content</div>' },
  });

  const transition = wrapper.findComponent({ name: 'Transition' });
  expect(transition.props('name')).toBe('bounce');
});

test('AnimationWrapper should disable animation name when enableAnimations is false', () => {
  mockConfig.ui.enableAnimations = false;

  const wrapper = mount(AnimationWrapper, {
    props: { animationName: 'bounce' },
    slots: { default: '<div>Content</div>' },
  });

  const transition = wrapper.findComponent({ name: 'Transition' });
  expect(transition.props('name')).toBeUndefined();
});

test('AnimationWrapper should apply mode when enableAnimations is true', () => {
  const wrapper = mount(AnimationWrapper, {
    props: { mode: 'in-out' },
    slots: { default: '<div>Content</div>' },
  });

  const transition = wrapper.findComponent({ name: 'Transition' });
  expect(transition.props('mode')).toBe('in-out');
});

test('AnimationWrapper should disable mode when enableAnimations is false', () => {
  mockConfig.ui.enableAnimations = false;

  const wrapper = mount(AnimationWrapper, {
    props: { mode: 'out-in' },
    slots: { default: '<div>Content</div>' },
  });

  const transition = wrapper.findComponent({ name: 'Transition' });
  expect(transition.props('mode')).toBeUndefined();
});

test('AnimationWrapper should enable css when enableAnimations is true and css prop is true', () => {
  const wrapper = mount(AnimationWrapper, {
    props: { css: true },
    slots: { default: '<div>Content</div>' },
  });

  const transition = wrapper.findComponent({ name: 'Transition' });
  expect(transition.props('css')).toBe(true);
});

test('AnimationWrapper should disable css when enableAnimations is false even if css prop is true', () => {
  mockConfig.ui.enableAnimations = false;

  const wrapper = mount(AnimationWrapper, {
    props: { css: true },
    slots: { default: '<div>Content</div>' },
  });

  const transition = wrapper.findComponent({ name: 'Transition' });
  expect(transition.props('css')).toBe(false);
});

test('AnimationWrapper should disable css when css prop is false even if enableAnimations is true', () => {
  const wrapper = mount(AnimationWrapper, {
    props: { css: false },
    slots: { default: '<div>Content</div>' },
  });

  const transition = wrapper.findComponent({ name: 'Transition' });
  expect(transition.props('css')).toBe(false);
});
