<template>
  <section class="calendar-heatmap">
    <e-chart-renderer
      :class="['chart', view]"
      :accessible-label="labels.ariaLabel"
      :option="option"
      @chart-click="onChartClick"
    />

    <app-flex row align-center end gap="sm" class="legend">
      <span>{{ labels.less }}</span>
      <app-flex row align-center gap="xs" class="swatches" aria-hidden="true">
        <span
          v-for="(color, index) in legendColors"
          :key="index"
          class="swatch"
          :style="{ backgroundColor: color }"
        />
      </app-flex>
      <span>{{ labels.more }}</span>
    </app-flex>
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';
import EChartRenderer from './EChartRenderer.vue';
import { createCalendarHeatmapPalette } from './calendar-heatmap-palette';
import { createCalendarHeatmapOption } from './calendar-heatmap';
import type {
  AppCalendarHeatmapChartProps,
  CalendarHeatmapSeriesValue,
} from './calendar-heatmap-types';
import type { ECElementEvent } from './echarts-runtime';
import { useChartPalette } from './use-chart-palette';

const props = withDefaults(defineProps<AppCalendarHeatmapChartProps>(), {
  view: 'year',
  locale: 'en-US',
  selectedDate: undefined,
});

const emit = defineEmits<{
  selectDate: [date: string];
}>();

const palette = useChartPalette(createCalendarHeatmapPalette);

const option = computed(() =>
  createCalendarHeatmapOption({
    entries: props.entries,
    labels: props.labels,
    locale: props.locale,
    month: props.month,
    palette: palette.value,
    selectedDate: props.selectedDate,
    view: props.view,
    year: props.year,
  }),
);

const legendColors = computed(() => [palette.value.empty, ...palette.value.levels]);

const onChartClick = (event: ECElementEvent): void => {
  if (event.seriesType !== 'heatmap') return;
  const [date] = event.value as CalendarHeatmapSeriesValue;
  emit('selectDate', date);
};
</script>

<style lang="scss" scoped>
.calendar-heatmap {
  width: 100%;
  min-width: 0;
}

.chart {
  width: 100%;

  &.year {
    height: var(--chart-calendar-year-height);
  }

  &.month {
    height: var(--chart-calendar-month-height);
  }
}

.legend {
  @include fontify(var(--font-size-xs), normal, var(--fg-muted));
  padding-top: var(--padding-sm);
}

.swatches {
  line-height: 0;
}

.swatch {
  width: var(--font-size-xs);
  height: var(--font-size-xs);
  border: 1px solid color-mix(in srgb, var(--fg) 10%, transparent);
  border-radius: 2px;
}
</style>
