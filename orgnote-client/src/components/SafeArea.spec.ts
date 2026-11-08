import { mount } from '@vue/test-utils';
import SafeArea from './SafeArea.vue';
import { describe, test, expect } from 'vitest';

describe('SafeArea', () => {
  test('renders slot content', () => {
    const wrapper = mount(SafeArea, {
      slots: {
        default: '<div class="test-content">Content</div>',
      },
    });

    expect(wrapper.find('.test-content').text()).toBe('Content');
  });

  test('applies both top and bottom classes by default', () => {
    const wrapper = mount(SafeArea);

    expect(wrapper.classes()).toContain('top');
    expect(wrapper.classes()).toContain('bottom');
  });

  test('applies only top class when top prop is true', () => {
    const wrapper = mount(SafeArea, {
      props: { top: true },
    });

    expect(wrapper.classes()).toContain('top');
    expect(wrapper.classes()).not.toContain('bottom');
  });

  test('applies only bottom class when bottom prop is true', () => {
    const wrapper = mount(SafeArea, {
      props: { bottom: true },
    });

    expect(wrapper.classes()).not.toContain('top');
    expect(wrapper.classes()).toContain('bottom');
  });

  test('applies both classes when top and bottom props are true', () => {
    const wrapper = mount(SafeArea, {
      props: { top: true, bottom: true },
    });

    expect(wrapper.classes()).toContain('top');
    expect(wrapper.classes()).toContain('bottom');
  });

  test('has safe-area base class', () => {
    const wrapper = mount(SafeArea);

    expect(wrapper.classes()).toContain('safe-area');
  });

  test('adds disable class when disable prop is true', () => {
    const wrapper = mount(SafeArea, {
      props: { disable: true },
    });

    expect(wrapper.classes()).toContain('disable');
  });

  test('does not add disable class by default', () => {
    const wrapper = mount(SafeArea);

    expect(wrapper.classes()).not.toContain('disable');
  });
});
