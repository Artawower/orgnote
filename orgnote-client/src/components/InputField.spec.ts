import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import InputField from './InputField.vue';

test('InputField renders input element', () => {
  const wrapper = mount(InputField, {
    props: {
      modelValue: 'value',
      type: 'text',
      'onUpdate:modelValue': () => {},
    },
  });

  expect(wrapper.find('input').exists()).toBe(true);
});

test('InputField does not render password toggle for non-password type', () => {
  const wrapper = mount(InputField, {
    props: {
      modelValue: 'value',
      type: 'text',
      passwordToggle: true,
      'onUpdate:modelValue': () => {},
    },
  });

  expect(wrapper.find('.password-toggle').exists()).toBe(false);
});

test('InputField renders password toggle for password type', () => {
  const wrapper = mount(InputField, {
    props: {
      modelValue: 'secret',
      type: 'password',
      passwordToggle: true,
      'onUpdate:modelValue': () => {},
    },
  });

  expect(wrapper.find('.password-toggle').exists()).toBe(true);
  expect(wrapper.find('input').attributes('type')).toBe('password');
});

test('InputField toggles password visibility on button click', async () => {
  const wrapper = mount(InputField, {
    props: {
      modelValue: 'secret',
      type: 'password',
      passwordToggle: true,
      'onUpdate:modelValue': () => {},
    },
  });

  const toggle = wrapper.find('.password-toggle');

  await toggle.trigger('click');
  expect(wrapper.find('input').attributes('type')).toBe('text');

  await toggle.trigger('click');
  expect(wrapper.find('input').attributes('type')).toBe('password');
});

test('InputField exposes focus method', () => {
  const wrapper = mount(InputField, {
    props: {
      modelValue: 'value',
      type: 'text',
      'onUpdate:modelValue': () => {},
    },
  });

  expect(wrapper.vm.focus).toBeDefined();
  expect(typeof wrapper.vm.focus).toBe('function');
});
