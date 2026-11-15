<template>
  <section class="time-range-bar-chart">
    <e-chart-renderer
      class="chart"
      :accessible-label="labels.ariaLabel"
      :option="option"
    />
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import EChartRenderer from './EChartRenderer.vue';
import { createChartPalette } from './chart-palette';
import { createTimeRangeBarOption } from './time-range-bar';
import type { AppTimeRangeBarChartProps } from './time-range-bar-types';
import { useChartPalette } from './use-chart-palette';

const props = withDefaults(defineProps<AppTimeRangeBarChartProps>(), {
  locale: 'en-US',
});

const palette = useChartPalette(createChartPalette);

const option = computed(() =>
  createTimeRangeBarOption({
    entries: props.entries,
    labels: props.labels,
    locale: props.locale,
    palette: palette.value,
    range: props.range,
  }),
);
</script>

<style lang="scss" scoped>
.time-range-bar-chart {
  width: 100%;
  min-width: 0;
}

.chart {
  width: 100%;
  height: var(--chart-time-range-height);
}
</style>
