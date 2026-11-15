<template>
  <svg class="progress-ring" viewBox="0 0 24 24" aria-hidden="true">
    <circle class="track" cx="12" cy="12" r="9" />
    <circle
      class="progress"
      :class="`progress-${level}`"
      cx="12"
      cy="12"
      r="9"
      :style="progressStyle"
    />
  </svg>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const props = defineProps<{
  ratio: number;
  level: 'none' | 'partial' | 'full';
}>();

const progressStyle = computed(() => ({
  strokeDasharray: String(CIRCUMFERENCE),
  strokeDashoffset: String(CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, props.ratio)))),
}));
</script>

<style lang="scss" scoped>
.progress-ring {
  width: var(--progress-ring-size, 28px);
  height: var(--progress-ring-size, 28px);
  transform: rotate(-90deg);
  flex-shrink: 0;
}

.track {
  fill: none;
  stroke: var(--fg-muted);
  stroke-width: 2.5;
  opacity: 0.2;
}

.progress {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s ease;
}

.progress-full {
  stroke: var(--accent);
}

.progress-partial {
  stroke: var(--blue);
}

.progress-none {
  stroke: transparent;
}
</style>
