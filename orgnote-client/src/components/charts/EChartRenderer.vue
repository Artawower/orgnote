<template>
  <div ref="rootRef" role="img" :aria-label="accessibleLabel" />
</template>

<script lang="ts" setup>
import { useResizeObserver } from '@vueuse/core';
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import {
  init,
  type ECElementEvent,
  type EChartsCoreOption,
  type EChartsType,
} from './echarts-runtime';

export interface EChartRendererProps {
  option: EChartsCoreOption;
  accessibleLabel: string;
}

const props = defineProps<EChartRendererProps>();
const emit = defineEmits<{
  chartClick: [event: ECElementEvent];
}>();

const rootRef = ref<HTMLElement>();
const chart = shallowRef<EChartsType>();

const syncOption = (): void => {
  chart.value?.setOption(props.option, { notMerge: true });
};

const createChart = (): void => {
  if (!rootRef.value) return;
  const instance = init(rootRef.value, undefined, { renderer: 'svg' });
  instance.on('click', (event) => emit('chartClick', event));
  chart.value = instance;
  syncOption();
};

useResizeObserver(rootRef, () => chart.value?.resize());

onMounted(createChart);

onBeforeUnmount(() => {
  chart.value?.dispose();
  chart.value = undefined;
});

watch(() => props.option, syncOption);
</script>
