import { expect, test } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import ProgressRing from './ProgressRing.vue';

const AppInput = {
  props: ['modelValue', 'disabled'],
  emits: ['change'],
  template: '<input :value="modelValue" :disabled="disabled" @change="$emit(\'change\', $event)" />',
};

const SlotStub = {
  template: '<div><slot /></div>',
};

test('allows changing Pomodoro duration during an active session', async () => {
  const wrapper = shallowMount(ProgressRing, {
    props: {
      progress: 0.5,
      displayTime: '10:00',
      sessionType: 'pomo',
      isRunning: true,
      hasSession: true,
      disabled: false,
      phaseLabel: 'Pomodoro',
      durationMin: 25,
    },
    global: {
      stubs: {
        'app-flex': SlotStub,
        'app-input': AppInput,
      },
    },
  });
  const input = wrapper.find('input');

  expect(wrapper.find('.display-time').text()).toBe('10:00');
  expect(input.exists()).toBe(true);
  await input.setValue('40');

  expect(wrapper.emitted('update:durationMin')).toEqual([[40]]);
});

test('disables duration changes during a task transition', () => {
  const wrapper = shallowMount(ProgressRing, {
    props: {
      progress: 0.5,
      displayTime: '10:00',
      sessionType: 'pomo',
      isRunning: true,
      hasSession: true,
      disabled: true,
      phaseLabel: 'Pomodoro',
      durationMin: 25,
    },
    global: {
      stubs: {
        'app-flex': SlotStub,
        'app-input': AppInput,
      },
    },
  });

  expect(wrapper.find('input').attributes('disabled')).toBeDefined();
});
