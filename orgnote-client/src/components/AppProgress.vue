<template>
  <app-flex class="app-progress" column :gap="gap">
    <app-flex v-if="showLabel" class="app-progress-header" between align-center>
      <span class="app-progress-label">{{ label }}</span>
      <span class="app-progress-value">{{ formattedValue }}</span>
    </app-flex>
    <div class="app-progress-container" :class="[sizeClass]">
      <div class="app-progress-track">
        <div class="app-progress-fill" :class="[variantClass]" :style="fillStyle" />
      </div>
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import type { StyleSize } from 'orgnote-api';
import { computed } from 'vue';
import AppFlex from './AppFlex.vue';

export type ProgressVariant = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface AppProgressProps {
  value: number;
  max?: number;
  label?: string;
  showLabel?: boolean;
  labelFormat?: 'percent' | 'value' | 'fraction';
  size?: StyleSize;
  variant?: ProgressVariant;
  autoVariant?: boolean;
  gap?: StyleSize;
}

const props = withDefaults(defineProps<AppProgressProps>(), {
  max: 100,
  showLabel: false,
  labelFormat: 'percent',
  size: 'md',
  variant: 'accent',
  autoVariant: false,
  gap: 'xs',
});

const normalizedValue = computed(() => {
  const ratio = props.value / props.max;
  return Math.min(Math.max(ratio, 0), 1);
});

const percentage = computed(() => normalizedValue.value * 100);

const fillStyle = computed(() => ({
  width: `${percentage.value}%`,
}));

const sizeClass = computed(() => `size-${props.size}`);

const resolvedVariant = computed<ProgressVariant>(() => {
  if (!props.autoVariant) return props.variant;
  if (normalizedValue.value < 0.33) return 'success';
  if (normalizedValue.value < 0.66) return 'warning';
  return 'danger';
});

const variantClass = computed(() => `variant-${resolvedVariant.value}`);

const labelFormatters: Record<NonNullable<AppProgressProps['labelFormat']>, () => string> = {
  value: () => `${props.value}`,
  fraction: () => `${props.value} / ${props.max}`,
  percent: () => `${percentage.value.toFixed(1)}%`,
};

const formattedValue = computed(() => labelFormatters[props.labelFormat]());
</script>

<style lang="scss" scoped>
.app-progress {
  width: 100%;
}

.app-progress-header {
  width: 100%;
}

.app-progress-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--fg);
}

.app-progress-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--fg-muted);
}

.app-progress-container {
  width: 100%;
  background: var(--bg-muted);
  border: 2px solid var(--bg-muted);
  border-radius: var(--border-radius-lg);
  box-sizing: border-box;

  &.size-xs {
    padding: 1px;
    border-width: 1px;

    .app-progress-track {
      height: 6px;
    }
  }

  &.size-sm {
    padding: 2px;
    border-width: 1px;

    .app-progress-track {
      height: 10px;
    }
  }

  &.size-md {
    padding: 3px;
    border-width: 2px;

    .app-progress-track {
      height: 14px;
    }
  }

  &.size-lg {
    padding: 3px;
    border-width: 2px;

    .app-progress-track {
      height: 22px;
    }
  }

  &.size-xl {
    padding: 4px;
    border-width: 3px;

    .app-progress-track {
      height: 30px;
    }
  }
}

.app-progress-track {
  width: 100%;
  border-radius: calc(var(--border-radius-lg) - 4px);
  overflow: hidden;
}

.app-progress-fill {
  height: 100%;
  border-radius: calc(var(--border-radius-lg) - 4px);
  transition: width 0.3s ease;

  &.variant-primary {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--blue), white 15%) 0%,
      var(--blue) 100%
    );
  }

  &.variant-accent {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--violet), white 15%) 0%,
      var(--violet) 100%
    );
  }

  &.variant-success {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--green), white 15%) 0%,
      var(--green) 100%
    );
  }

  &.variant-warning {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--yellow), white 15%) 0%,
      var(--yellow) 100%
    );
  }

  &.variant-danger {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--red), white 15%) 0%,
      var(--red) 100%
    );
  }

  &.variant-info {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cyan), white 15%) 0%,
      var(--cyan) 100%
    );
  }
}
</style>
