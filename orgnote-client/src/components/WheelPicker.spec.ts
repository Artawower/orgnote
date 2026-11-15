import { mount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import WheelPicker from './WheelPicker.vue';

const options = [
  { value: 0, label: '00' },
  { value: 1, label: '01' },
  { value: 2, label: '02' },
];

test('wheel picker selects an option by pointer', async () => {
  const wrapper = mount(WheelPicker, {
    props: {
      modelValue: 1,
      options,
      label: 'Hours',
    },
  });

  await wrapper.find('[role="option"][data-value="2"]').trigger('click');

  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2]);
});

test('wheel picker updates selection while scrolling', async () => {
  const requestFrame = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  const wrapper = mount(WheelPicker, {
    props: {
      modelValue: 0,
      options,
      label: 'Hours',
    },
  });
  const listbox = wrapper.find<HTMLElement>('[role="listbox"]');

  listbox.element.scrollTop = 88;
  await listbox.trigger('scroll');

  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2]);
  requestFrame.mockRestore();
});

test('wheel picker centres the selected option using rendered geometry', async () => {
  const wrapper = mount(WheelPicker, {
    props: {
      modelValue: 0,
      options,
      label: 'Hours',
    },
  });
  const listbox = wrapper.find<HTMLElement>('[role="listbox"]').element;
  const scrollTo = vi.fn();
  Object.defineProperty(listbox, 'clientHeight', { value: 100 });
  Object.defineProperty(listbox, 'scrollTo', { value: scrollTo });
  Array.from(listbox.children).forEach((child, index) => {
    Object.defineProperty(child, 'offsetHeight', { value: 44 });
    Object.defineProperty(child, 'offsetTop', { value: 30 + index * 44 });
  });

  await wrapper.find('[role="option"][data-value="2"]').trigger('click');

  expect(scrollTo).toHaveBeenLastCalledWith({ top: 90 });
});

test('wheel picker edits the selected option directly', async () => {
  const hourOptions = Array.from({ length: 24 }, (_, value) => ({
    value,
    label: String(value).padStart(2, '0'),
  }));
  const wrapper = mount(WheelPicker, {
    props: {
      modelValue: 1,
      options: hourOptions,
      label: 'Hours',
    },
  });
  const input = wrapper.find<HTMLInputElement>('.wheel-input');

  await input.trigger('focus');
  await input.setValue('2');
  await input.setValue('23');

  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([23]);
});

test('wheel picker does not treat an empty input as zero', async () => {
  const wrapper = mount(WheelPicker, {
    props: {
      modelValue: 1,
      options,
      label: 'Hours',
    },
  });
  const input = wrapper.find<HTMLInputElement>('.wheel-input');

  await input.trigger('focus');
  await input.setValue('');

  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
});

test('wheel picker changes the selected option from the embedded input wheel', async () => {
  const wrapper = mount(WheelPicker, {
    props: {
      modelValue: 1,
      options,
      label: 'Hours',
    },
  });

  await wrapper.find('.wheel-input').trigger('wheel', { deltaY: 1 });

  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2]);
});

test('wheel picker supports keyboard navigation', async () => {
  const wrapper = mount(WheelPicker, {
    props: {
      modelValue: 1,
      options,
      label: 'Hours',
    },
  });

  await wrapper.find('[role="listbox"]').trigger('keydown', { key: 'ArrowDown' });

  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2]);
});

test('wheel picker exposes the selected option accessibly', () => {
  const wrapper = mount(WheelPicker, {
    props: {
      modelValue: 1,
      options,
      label: 'Hours',
    },
  });
  const input = wrapper.find('[role="spinbutton"]');

  expect(wrapper.find('[role="listbox"]').attributes('aria-label')).toBe('Hours');
  expect(wrapper.find('[role="option"][aria-selected="true"]').text()).toBe('01');
  expect(input.attributes('aria-valuemin')).toBe('0');
  expect(input.attributes('aria-valuemax')).toBe('2');
  expect(input.attributes('aria-valuenow')).toBe('1');
});
