<template>
  <div ref="listElement" class="app-virtual-list" :class="{ 'own-scroll': !scrollParent }">
    <div class="virtual-spacer" :style="{ height: `${virtualizer.getTotalSize()}px` }">
      <div
        v-for="row in virtualRows"
        :key="String(row.key)"
        :ref="measureRow"
        :data-index="row.index"
        class="virtual-row"
        :style="{ transform: `translateY(${row.start - scrollMargin}px)` }"
      >
        <slot :item="items?.[row.index]" :index="row.index" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup generic="T">
import { computed, onMounted, ref, watch, type ComponentPublicInstance } from 'vue';
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/vue-virtual';
import type { AppVirtualListExpose, ScrollAlign, VisibleRange } from './app-virtual-list.types';

const DEFAULT_OVERSCAN = 5;

const props = withDefaults(
  defineProps<{
    items?: readonly T[];
    count?: number;
    itemSize: number;
    overscan?: number;
    itemKey?: (item: T | undefined, index: number) => string | number;
    scrollParent?: boolean;
    pinnedIndexes?: readonly number[];
  }>(),
  {
    items: undefined,
    count: undefined,
    overscan: DEFAULT_OVERSCAN,
    itemKey: undefined,
    scrollParent: false,
    pinnedIndexes: () => [],
  },
);

const emit = defineEmits<{
  range: [range: VisibleRange];
}>();

defineSlots<{
  default(props: { item: T | undefined; index: number }): unknown;
}>();

const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll']);

const listElement = ref<HTMLElement | null>(null);
const scrollElement = ref<HTMLElement | null>(null);
const scrollMargin = ref(0);

const isScrollable = (element: HTMLElement): boolean =>
  SCROLLABLE_OVERFLOW.has(getComputedStyle(element).overflowY);

const findScrollableAncestor = (element: HTMLElement): HTMLElement | null => {
  const parent = element.parentElement;
  if (!parent) return null;
  return isScrollable(parent) ? parent : findScrollableAncestor(parent);
};

const measureScrollMargin = (list: HTMLElement, host: HTMLElement): number =>
  list.getBoundingClientRect().top - host.getBoundingClientRect().top + host.scrollTop;

const attachScrollElement = (): void => {
  const list = listElement.value;
  if (!list) return;
  const host = props.scrollParent ? findScrollableAncestor(list) : list;
  scrollMargin.value = host && host !== list ? measureScrollMargin(list, host) : 0;
  scrollElement.value = host;
};

onMounted(attachScrollElement);

const itemCount = computed(() => props.count ?? props.items?.length ?? 0);

const createItemKeyResolver = (
  items: readonly T[] | undefined,
  itemKey: ((item: T | undefined, index: number) => string | number) | undefined,
) => (index: number): string | number => (itemKey ? itemKey(items?.[index], index) : index);

const createRangeExtractor = (pinnedIndexes: readonly number[]) => (range: Range): number[] => {
  const pinnedInRange = pinnedIndexes.filter((index) => index >= 0 && index < range.count);
  if (!pinnedInRange.length) return defaultRangeExtractor(range);
  const indexes = new Set([...defaultRangeExtractor(range), ...pinnedInRange]);
  return [...indexes].sort((left, right) => left - right);
};

const virtualizer = useVirtualizer(
  computed(() => ({
    count: itemCount.value,
    getScrollElement: () => scrollElement.value,
    estimateSize: () => props.itemSize,
    overscan: props.overscan,
    useAnimationFrameWithResizeObserver: true,
    getItemKey: createItemKeyResolver(props.items, props.itemKey),
    scrollMargin: scrollMargin.value,
    rangeExtractor: createRangeExtractor(props.pinnedIndexes),
  })),
);

const virtualRows = computed(() => virtualizer.value.getVirtualItems());

const visibleRange = computed<VisibleRange | undefined>(() => {
  if (!virtualRows.value.length) return;
  const range = virtualizer.value.range;
  if (!range) return;
  return { start: range.startIndex, end: range.endIndex };
});

watch(
  () => [visibleRange.value?.start, visibleRange.value?.end],
  () => {
    if (visibleRange.value) emit('range', visibleRange.value);
  },
);

const measureRow = (element: Element | ComponentPublicInstance | null): void => {
  if (!(element instanceof Element)) return;
  virtualizer.value.measureElement(element);
};

const scrollToIndex = (index: number, align: ScrollAlign = 'auto'): void => {
  virtualizer.value.scrollToIndex(index, { align });
};

defineExpose<AppVirtualListExpose>({ scrollToIndex });
</script>

<style lang="scss" scoped>
.app-virtual-list.own-scroll {
  overflow-y: auto;
  contain: content;
}

.virtual-spacer {
  position: relative;
  width: 100%;
}

.virtual-row {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}
</style>
