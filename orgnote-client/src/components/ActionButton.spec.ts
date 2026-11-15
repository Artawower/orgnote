import { mount } from '@vue/test-utils';
import ActionButton from './ActionButton.vue';
import { test, expect, vi } from 'vitest';

test('ActionButton should render text from slot when provided', () => {
  const wrapper = mount(ActionButton, {
    props: { icon: 'sym_o_home' },
    slots: { text: 'Settings' },
  });

  expect(wrapper.text()).toContain('Settings');
});

test('ActionButton should emit click event when clicked', async () => {
  const wrapper = mount(ActionButton, {
    props: { icon: 'sym_o_home' },
  });

  await wrapper.trigger('click');

  expect(wrapper.emitted('click')).toBeTruthy();
  expect(wrapper.emitted('click')).toHaveLength(1);
});

test('ActionButton should emit click event on each click', async () => {
  const wrapper = mount(ActionButton, {
    props: { icon: 'sym_o_home' },
  });

  await wrapper.trigger('click');
  await wrapper.trigger('click');
  await wrapper.trigger('click');

  expect(wrapper.emitted('click')).toHaveLength(3);
});

test('ActionButton should change to fire icon when clicked and fireIcon provided', async () => {
  vi.useFakeTimers();

  const wrapper = mount(ActionButton, {
    props: {
      icon: 'sym_o_home',
      fireIcon: 'sym_o_check',
      fireColor: 'green',
    },
  });

  let icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.props('name')).toBe('sym_o_home');

  await wrapper.trigger('click');
  await wrapper.vm.$nextTick();

  icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.props('name')).toBe('sym_o_check');
  expect(icon.props('color')).toBe('green');

  vi.advanceTimersByTime(1000);
  await wrapper.vm.$nextTick();

  icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.props('name')).toBe('sym_o_home');

  vi.useRealTimers();
});

test.each(['xs', 'sm', 'md', 'lg', 'xl'] as const)(
  'ActionButton should expose %s size class',
  (size) => {
    const wrapper = mount(ActionButton, {
      props: { icon: 'sym_o_home', size },
    });

    expect(wrapper.find('button').classes()).toContain(`icon-${size}`);
  },
);

test('ActionButton should have custom classes on button element when passed', () => {
  const wrapper = mount(ActionButton, {
    props: {
      icon: 'sym_o_home',
      classes: 'my-custom-class another-class',
    },
  });

  const button = wrapper.find('button');
  expect(button.classes()).toContain('my-custom-class');
  expect(button.classes()).toContain('another-class');
});

test('ActionButton should have outline class when outline prop is true', () => {
  const wrapper = mount(ActionButton, {
    props: {
      icon: 'sym_o_home',
      outline: true,
    },
  });

  expect(wrapper.find('button').classes()).toContain('outline');
});

test('ActionButton should have border class when border prop is true', () => {
  const wrapper = mount(ActionButton, {
    props: {
      icon: 'sym_o_home',
      border: true,
    },
  });

  expect(wrapper.find('button').classes()).toContain('border');
});
