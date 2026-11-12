<template>
  <app-flex class="time-picker" row center align-start gap="md">
    <app-flex class="column hours" column center align-center gap="xs">
      <span class="label">{{ hoursLabel }}</span>
      <wheel-picker
        :model-value="modelValue.hours"
        :options="hourOptions"
        :label="`${label}: ${hoursLabel}`"
        @update:model-value="updateHours"
      />
    </app-flex>
    <app-flex class="column minutes" column center align-center gap="xs">
      <span class="label">{{ minutesLabel }}</span>
      <wheel-picker
        :model-value="modelValue.minutes"
        :options="minuteOptions"
        :label="`${label}: ${minutesLabel}`"
        @update:model-value="updateMinutes"
      />
    </app-flex>
  </app-flex>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TimePickerValue } from 'src/models/time-picker';
import AppFlex from './AppFlex.vue';
import WheelPicker from './WheelPicker.vue';

const MAXIMUM_MINUTES = 59;
const MINIMUM_VALUE = 0;

const props = defineProps<{
  modelValue: TimePickerValue;
  label: string;
  maximumValue: TimePickerValue;
  hoursLabel: string;
  minutesLabel: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: TimePickerValue];
}>();

const createOptions = (maximum: number) =>
  Array.from({ length: maximum + 1 }, (_, value) => ({
    value,
    label: String(value).padStart(2, '0'),
  }));

const getMaximumMinutes = (hours: number): number =>
  hours >= props.maximumValue.hours ? props.maximumValue.minutes : MAXIMUM_MINUTES;

const maximumHours = computed(() =>
  Math.floor(Math.max(props.maximumValue.hours, MINIMUM_VALUE)),
);
const maximumMinutes = computed(() => getMaximumMinutes(props.modelValue.hours));
const hourOptions = computed(() => createOptions(maximumHours.value));
const minuteOptions = computed(() => createOptions(maximumMinutes.value));

const updateValue = (value: TimePickerValue): void => emit('update:modelValue', value);

const updateHours = (hours: number): void =>
  updateValue({
    hours,
    minutes: Math.min(props.modelValue.minutes, getMaximumMinutes(hours)),
  });

const updateMinutes = (minutes: number): void =>
  updateValue({
    hours: props.modelValue.hours,
    minutes,
  });
</script>

<style scoped lang="scss">
.time-picker {
  --time-wheel-width: clamp(76px, 24vw, 96px);
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  align-self: center;
  overflow-x: clip;
}

.column {
  width: var(--time-wheel-width);
  max-width: var(--time-wheel-width);
  min-width: 0;
  flex: 0 1 var(--time-wheel-width);
}

.label {
  @include fontify(var(--font-size-xs), var(--font-weight-medium), false);
  color: var(--fg-muted);
}
</style>
