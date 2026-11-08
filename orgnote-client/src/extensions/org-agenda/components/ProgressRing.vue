<template>
  <div class="ring-wrapper">
    <svg
      class="progress-ring"
      :class="{ 'ring-spinning': sessionType === 'stopwatch' && isRunning }"
      :viewBox="`0 0 ${SVG_SIZE} ${SVG_SIZE}`"
    >
      <circle class="ring-track" :cx="SVG_CENTER" :cy="SVG_CENTER" :r="RING_RADIUS" />
      <circle
        v-if="sessionType === 'pomo' && hasSession"
        class="ring-fill"
        :cx="SVG_CENTER"
        :cy="SVG_CENTER"
        :r="RING_RADIUS"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
      <circle
        v-if="sessionType === 'stopwatch'"
        class="ring-fill ring-arc"
        :cx="SVG_CENTER"
        :cy="SVG_CENTER"
        :r="RING_RADIUS"
        :stroke-dasharray="`${arcLength} ${circumference - arcLength}`"
        stroke-dashoffset="0"
      />
    </svg>

    <app-flex class="ring-content" column align-center center gap="xxs" @click="emit('click')">
      <span v-if="hasSession" class="display-time">{{ displayTime }}</span>
      <app-flex
        v-if="sessionType === 'pomo'"
        row
        align-end
        gap="xs"
        class="duration-row"
        :class="{ active: hasSession }"
      >
        <app-input
          :model-value="durationMin"
          :disabled="disabled"
          class="duration-input"
          type="number"
          @click.stop
          @change="onInputChange"
        />
        <span class="duration-unit">min</span>
      </app-flex>
      <span v-else-if="!hasSession" class="display-time muted">00:00</span>
      <span class="phase-label">{{ phaseLabel }}</span>
    </app-flex>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppInput from 'src/components/AppInput.vue';

const props = defineProps<{
  progress: number;
  displayTime: string;
  sessionType: 'pomo' | 'stopwatch';
  isRunning: boolean;
  hasSession: boolean;
  disabled: boolean;
  phaseLabel: string;
  durationMin: number;
}>();

const emit = defineEmits<{
  click: [];
  'update:durationMin': [value: number];
}>();

const SVG_SIZE = 280;
const SVG_CENTER = SVG_SIZE / 2;
const RING_RADIUS = 120;
const circumference = 2 * Math.PI * RING_RADIUS;
const arcLength = circumference * 0.25;

const dashOffset = computed(() => circumference * (1 - props.progress));

const onInputChange = (e: Event): void => {
  const value = Number((e.target as HTMLInputElement).value);
  emit('update:durationMin', value);
};
</script>

<style lang="scss" scoped>
.ring-wrapper {
  position: relative;
  width: 280px;
  height: 280px;
  flex-shrink: 0;
}

.progress-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-track {
  fill: none;
  stroke: var(--pomodoro-ring-track-color);
  stroke-width: 12;
}

.ring-fill {
  fill: none;
  stroke: var(--pomodoro-ring-color);
  stroke-width: 12;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.9s linear;
}

.ring-arc {
  transition: none;
  opacity: 0.3;
}

.ring-spinning {
  animation: ring-spin 2.8s linear infinite;
  transform-origin: center;

  .ring-arc {
    opacity: 1;
  }
}

@keyframes ring-spin {
  from {
    transform: rotate(-90deg);
  }
  to {
    transform: rotate(270deg);
  }
}

.ring-content {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

.display-time {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-regular);
  color: var(--fg);
  letter-spacing: 4px;
  line-height: 1;
  font-variant-numeric: tabular-nums;

  &.muted {
    color: var(--fg-muted);
  }
}

.duration-row {
  line-height: 1;

  &.active {
    .duration-input {
      width: 48px;
      font-size: var(--font-size-md);
    }

    .duration-unit {
      padding-bottom: 0;
      font-size: var(--font-size-xs);
    }
  }
}

.duration-input {
  width: 80px;
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-regular);
  text-align: right;
  line-height: 1;
  font-variant-numeric: tabular-nums;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    display: none;
  }
}

.duration-unit {
  @include fontify(var(--font-size-md), var(--font-weight-regular), false);
  color: var(--fg-muted);
  padding-bottom: var(--gap-sm);
}

.phase-label {
  @include fontify(var(--font-size-xs), var(--font-weight-regular), false);
  color: var(--fg-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
}
</style>
