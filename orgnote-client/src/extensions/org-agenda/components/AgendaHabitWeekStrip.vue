<template>
  <app-flex row gap="xs" full-width>
    <app-flex
      v-for="day in weekDays"
      :key="day.date"
      tag="button"
      type="button"
      column
      align-center
      gap="sm"
      class="day-cell"
      :class="{ 'is-today': day.isToday, 'is-selected': day.date === selectedDate }"
      @click="emit('select', day.date)"
    >
      <span class="day-label">{{ day.dayLabel }}</span>
      <span class="day-number">{{ dayNumber(day.date) }}</span>
      <habit-progress-ring :ratio="day.completionRatio" :level="day.completionLevel" />
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import { format, parseISO } from 'date-fns';
import AppFlex from 'src/components/AppFlex.vue';
import HabitProgressRing from './HabitProgressRing.vue';
import type { WeekDayCompletion } from '../types';

defineProps<{ weekDays: WeekDayCompletion[]; selectedDate: string }>();
const emit = defineEmits<{ select: [date: string] }>();

const dayNumber = (date: string): string => format(parseISO(date), 'd');
</script>

<style lang="scss" scoped>
.day-cell {
  flex: 1;
  padding: var(--padding-lg);
  border-radius: var(--border-radius-md);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease;
  max-width: var(--habit-week-strip-cell-max-width, 64px);

  &:hover {
    background: var(--bg-hover);
  }
}

.day-label {
  font-size: var(--font-size-xs);
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1;
}

.day-number {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--fg-muted);
  line-height: 1;
}

.is-today {
  .day-label,
  .day-number {
    color: var(--accent);
  }
}

.is-selected {
  background: color-mix(in srgb, var(--accent), transparent 90%);

  .day-label,
  .day-number {
    color: var(--accent);
  }
}
</style>
