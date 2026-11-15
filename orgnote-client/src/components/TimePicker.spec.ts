import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { expect, test } from 'vitest';
import TimePicker from './TimePicker.vue';

const createWrapper = () =>
  mount(TimePicker, {
    props: {
      modelValue: { hours: 1, minutes: 30 },
      label: 'Time',
      maximumValue: { hours: 23, minutes: 59 },
      hoursLabel: 'Hours',
      minutesLabel: 'Minutes',
    },
  });

const createControlledWrapper = (
  initialValue = { hours: 1, minutes: 30 },
  maximumValue = { hours: 23, minutes: 59 },
) =>
  mount(
    defineComponent({
      components: { TimePicker },
      setup: () => ({ maximumValue, value: ref(initialValue) }),
      template: `
        <time-picker
          v-model="value"
          label="Time"
          :maximum-value="maximumValue"
          hours-label="Hours"
          minutes-label="Minutes"
        />
      `,
    }),
  );

test('time picker uses matching wheels for hours and minutes', () => {
  const wrapper = createWrapper();

  expect(wrapper.findAll('[role="listbox"]')).toHaveLength(2);
  expect(wrapper.find('.hours [aria-selected="true"]').text()).toBe('01');
  expect(wrapper.find('.minutes [aria-selected="true"]').text()).toBe('30');
});

test('typing a desktop hour moves the matching wheel', async () => {
  const wrapper = createControlledWrapper();
  const hoursInput = wrapper.find<HTMLInputElement>('.hours .wheel-input');

  await hoursInput.trigger('focus');
  await hoursInput.setValue('2');
  await hoursInput.setValue('23');

  expect(hoursInput.element.value).toBe('23');
  expect(wrapper.find('.hours [aria-selected="true"]').text()).toBe('23');
});

test('entering a desktop minute moves the matching wheel', async () => {
  const wrapper = createControlledWrapper();
  const minutesInput = wrapper.find<HTMLInputElement>('.minutes .wheel-input');

  await minutesInput.setValue('45');

  expect(minutesInput.element.value).toBe('45');
  expect(wrapper.find('.minutes [aria-selected="true"]').text()).toBe('45');
});

test('desktop segments support arrow key stepping', async () => {
  const wrapper = createControlledWrapper();
  const minutesInput = wrapper.find<HTMLInputElement>('.minutes .wheel-input');

  await minutesInput.trigger('keydown', { key: 'ArrowUp' });

  expect(minutesInput.element.value).toBe('31');
  expect(wrapper.find('.minutes [aria-selected="true"]').text()).toBe('31');
});

test('typing the maximum duration constrains minutes to zero', async () => {
  const wrapper = createControlledWrapper(
    { hours: 23, minutes: 30 },
    { hours: 24, minutes: 0 },
  );
  const hoursInput = wrapper.find<HTMLInputElement>('.hours .wheel-input');

  await hoursInput.trigger('focus');
  await hoursInput.setValue('2');
  await hoursInput.setValue('24');

  expect(hoursInput.element.value).toBe('24');
  expect(wrapper.find<HTMLInputElement>('.minutes .wheel-input').element.value).toBe('00');
  expect(wrapper.find('.minutes [aria-selected="true"]').text()).toBe('00');
});

test('time picker constrains minutes at its maximum hour', async () => {
  const wrapper = mount(TimePicker, {
    props: {
      modelValue: { hours: 23, minutes: 30 },
      label: 'Duration',
      maximumValue: { hours: 24, minutes: 0 },
      hoursLabel: 'Hours',
      minutesLabel: 'Minutes',
    },
  });

  await wrapper.find('.hours [role="option"][data-value="24"]').trigger('click');

  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ hours: 24, minutes: 0 }]);
});

test('moving a wheel updates the desktop field', async () => {
  const wrapper = createControlledWrapper();

  await wrapper.find('.hours [role="option"][data-value="2"]').trigger('click');

  expect(wrapper.find<HTMLInputElement>('.hours .wheel-input').element.value).toBe('02');
});

test('time picker emits a complete value when a wheel changes', async () => {
  const wrapper = createWrapper();

  await wrapper.find('.hours [role="option"][data-value="2"]').trigger('click');

  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ hours: 2, minutes: 30 }]);
});
