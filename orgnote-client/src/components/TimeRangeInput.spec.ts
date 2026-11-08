import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { defineComponent, ref } from 'vue';
import TimePicker from './TimePicker.vue';
import TimeRangeInput from './TimeRangeInput.vue';

const labels = {
  durationLabel: 'Duration',
  hoursLabel: 'Hours',
  minutesLabel: 'Minutes',
  startTimeLabel: 'Set start time',
  endTimeLabel: 'Ends at',
};

const createWrapper = () =>
  mount(TimeRangeInput, {
    props: {
      duration: { hours: 1, minutes: 30 },
      startTime: undefined,
      defaultStartTime: { hours: 8, minutes: 15 },
      endTime: undefined,
      ...labels,
    },
  });

const EnabledTimeRangeInput = defineComponent({
  components: { TimeRangeInput },
  setup: () => ({
    duration: ref({ hours: 1, minutes: 30 }),
    startTime: ref({ hours: 8, minutes: 15 }),
  }),
  template: `
    <time-range-input
      v-model:duration="duration"
      v-model:start-time="startTime"
      :default-start-time="{ hours: 8, minutes: 15 }"
      duration-label="Duration"
      hours-label="Hours"
      minutes-label="Minutes"
      start-time-label="Set start time"
      end-time-label="Ends at"
      end-time="09:45"
    />
  `,
});

test('time range input uses the shared time picker for duration', () => {
  const wrapper = createWrapper();

  expect(wrapper.findAllComponents(TimePicker)).toHaveLength(1);
  expect(wrapper.find('input[type="number"]').exists()).toBe(false);
  expect(wrapper.find('input[type="time"]').exists()).toBe(false);
});

test('time range input enables the same picker for an optional start time', async () => {
  const wrapper = createWrapper();

  await wrapper.find('.start-toggle input').trigger('click');
  expect(wrapper.emitted('update:startTime')?.at(-1)).toEqual([{ hours: 8, minutes: 15 }]);

  const enabledWrapper = mount(EnabledTimeRangeInput);
  expect(enabledWrapper.findAllComponents(TimePicker)).toHaveLength(2);
});

test('time range input limits duration to exactly twenty-four hours', () => {
  const wrapper = mount(TimeRangeInput, {
    props: {
      duration: { hours: 24, minutes: 0 },
      startTime: undefined,
      defaultStartTime: { hours: 8, minutes: 15 },
      endTime: undefined,
      ...labels,
    },
  });

  expect(wrapper.find('.duration-picker .hours [data-value="24"]').exists()).toBe(true);
  expect(wrapper.find('.duration-picker .hours [data-value="25"]').exists()).toBe(false);
  expect(wrapper.findAll('.duration-picker .minutes [role="option"]')).toHaveLength(1);
});

test('time range input displays a derived end time', () => {
  const wrapper = mount(EnabledTimeRangeInput);

  expect(wrapper.text()).toContain('Ends at 09:45');
});
