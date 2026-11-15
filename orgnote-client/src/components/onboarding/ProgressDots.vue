<template>
  <app-flex row center align-center gap="sm" class="progress-dots">
    <span v-for="step in totalSteps" :key="step" class="dot" :class="dotClass(step - 1)" />
  </app-flex>
</template>

<script lang="ts" setup>
import AppFlex from 'src/components/AppFlex.vue';

const props = defineProps<{
  totalSteps: number;
  currentStep: number;
}>();

const dotClass = (index: number): string => {
  if (index === props.currentStep) return 'active';
  if (index < props.currentStep) return 'completed';
  return 'upcoming';
};
</script>

<style lang="scss" scoped>
.progress-dots {
  padding: var(--margin-sm) 0;
}

.dot {
  width: var(--progress-indicator-size);
  height: var(--progress-indicator-size);
  border-radius: 50%;
  transition: all 0.2s ease;

  &.active {
    background: var(--accent);
  }

  &.completed {
    background: var(--fg-muted);
  }

  &.upcoming {
    background: transparent;
    border: 2px solid var(--fg-muted);
  }
}
</style>
