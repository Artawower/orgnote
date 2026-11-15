<template>
  <app-flex class="time-range-input" column align-stretch gap="md">
    <span class="section-label">{{ durationLabel }}</span>
    <time-picker
      v-model="duration"
      class="duration-picker"
      :label="durationLabel"
      :maximum-value="MAXIMUM_DURATION"
      :hours-label="hoursLabel"
      :minutes-label="minutesLabel"
    />

    <app-flex class="start-header" row between align-center gap="sm" full-width>
      <span class="section-label">{{ startTimeLabel }}</span>
      <app-checkbox v-model="isStartEnabled" class="start-toggle" />
    </app-flex>
    <time-picker
      v-if="startTime"
      v-model="startTime"
      class="start-picker"
      :label="startTimeLabel"
      :maximum-value="MAXIMUM_CLOCK_TIME"
      :hours-label="hoursLabel"
      :minutes-label="minutesLabel"
    />

    <span v-if="endTime" class="end-time">{{ endTimeLabel }} {{ endTime }}</span>
  </app-flex>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TimePickerValue } from 'src/models/time-picker';
import AppCheckbox from './AppCheckbox.vue';
import AppFlex from './AppFlex.vue';
import TimePicker from './TimePicker.vue';

const MAXIMUM_DURATION: TimePickerValue = { hours: 24, minutes: 0 };
const MAXIMUM_CLOCK_TIME: TimePickerValue = { hours: 23, minutes: 59 };

const props = defineProps<{
  defaultStartTime: TimePickerValue;
  durationLabel: string;
  hoursLabel: string;
  minutesLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  endTime?: string;
}>();

const duration = defineModel<TimePickerValue>('duration', { required: true });
const startTime = defineModel<TimePickerValue | undefined>('startTime');

const isStartEnabled = computed({
  get: () => Boolean(startTime.value),
  set: (enabled: boolean) => {
    startTime.value = enabled ? { ...props.defaultStartTime } : undefined;
  },
});
</script>

<style scoped lang="scss">
.time-range-input {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  align-self: stretch;
  overflow-x: clip;
}

.section-label,
.end-time {
  @include fontify(var(--font-size-sm), var(--font-weight-medium), false);
  color: var(--fg-muted);
}

.start-header {
  padding-top: var(--padding-md);
  border-top: 1px solid color-mix(in srgb, var(--fg-muted) 18%, transparent);
}

.end-time {
  text-align: center;
  color: var(--fg);
}
</style>
