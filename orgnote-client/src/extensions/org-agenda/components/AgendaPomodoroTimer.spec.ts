import { beforeEach, expect, test, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import AgendaPomodoroTimer from './AgendaPomodoroTimer.vue';
import { AGENDA_POMODORO_START_STOPWATCH_COMMAND } from '../constants';

const timer = vi.hoisted(() => ({
  hasSession: true,
  sessionType: 'pomo' as 'pomo' | 'stopwatch',
  isTransitioning: false,
  onDurationChange: vi.fn(),
  onSelectTask: vi.fn(),
  onRingClick: vi.fn(),
  onSessionTypeChange: vi.fn(),
}));

vi.mock('../composables/use-pomodoro-timer', () => ({
  usePomodoroTimer: () => ({
    t: (key: string) => key,
    displayTime: '10:00',
    progress: 0.5,
    isRunning: true,
    isPaused: false,
    localDuration: 25,
    taskLabel: 'Current task',
    modeOptions: [
      { value: 'pomo', label: 'Pomodoro' },
      { value: 'stopwatch', label: 'Stopwatch' },
    ],
    phaseLabel: 'Pomodoro',
    todayPomoCount: 0,
    ...timer,
  }),
}));

const AppSegmentedControl = {
  name: 'AppSegmentedControl',
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<button class="mode-control" :disabled="disabled" @click="$emit(\'update:modelValue\', \'stopwatch\')" />',
};

const AppButton = {
  name: 'AppButton',
  props: ['disabled'],
  emits: ['click'],
  template:
    '<button class="task-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};

const CommandActionButton = {
  props: ['command'],
  template: '<button class="command-button">{{ command }}</button>',
};

const SlotStub = {
  template: '<div><slot /></div>',
};

beforeEach(() => {
  vi.clearAllMocks();
  timer.hasSession = true;
  timer.sessionType = 'pomo';
  timer.isTransitioning = false;
});

test('allows changing mode and task while a session is active', async () => {
  const wrapper = shallowMount(AgendaPomodoroTimer, {
    global: {
      stubs: {
        'app-segmented-control': AppSegmentedControl,
        'app-button': AppButton,
        'app-flex': SlotStub,
        'app-icon': true,
        'overflow-line': true,
        'progress-ring': true,
        'command-action-button': CommandActionButton,
      },
    },
  });
  const modeControl = wrapper.find('.mode-control');
  const taskButton = wrapper.find('.task-button');

  expect(modeControl.attributes('disabled')).toBeUndefined();
  expect(taskButton.attributes('disabled')).toBeUndefined();
  await modeControl.trigger('click');
  await taskButton.trigger('click');

  expect(timer.onSessionTypeChange).toHaveBeenCalledWith('stopwatch');
  expect(timer.onSelectTask).toHaveBeenCalledOnce();
});

test('disables task and mode controls during a task transition', () => {
  timer.isTransitioning = true;
  const wrapper = shallowMount(AgendaPomodoroTimer, {
    global: {
      stubs: {
        'app-segmented-control': AppSegmentedControl,
        'app-button': AppButton,
        'app-flex': SlotStub,
        'app-icon': true,
        'overflow-line': true,
        'progress-ring': true,
        'command-action-button': CommandActionButton,
      },
    },
  });

  expect(wrapper.find('.mode-control').attributes('disabled')).toBeDefined();
  expect(wrapper.find('.task-button').attributes('disabled')).toBeDefined();
});

test('starts the selected stopwatch mode', () => {
  timer.hasSession = false;
  timer.sessionType = 'stopwatch';
  const wrapper = shallowMount(AgendaPomodoroTimer, {
    global: {
      stubs: {
        'app-segmented-control': AppSegmentedControl,
        'app-button': AppButton,
        'app-flex': SlotStub,
        'app-icon': true,
        'overflow-line': true,
        'progress-ring': true,
        'command-action-button': CommandActionButton,
      },
    },
  });

  const stopwatchAction = wrapper
    .findAllComponents(CommandActionButton)
    .find((button) => button.props('command') === AGENDA_POMODORO_START_STOPWATCH_COMMAND);

  expect(stopwatchAction).toBeDefined();
});
