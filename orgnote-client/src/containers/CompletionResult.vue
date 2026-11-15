<template>
  <app-virtual-list
    v-if="candidatesAvailable"
    ref="scrollTarget"
    :count="total"
    scroll-parent
    :item-size="itemHeight"
    v-slot="{ index }"
    class="completion-scroll full-width flex-1"
    @range="loadVisibleCandidates"
  >
    <async-item-container :items-list="displayModel.items" :index="index" :height="itemHeight">
      <template #default="{ item, index }">
        <completion-result-item
          :item="item as CompletionCandidate"
          :index="index"
          :selected="getCandidateIndex(index) === activeCompletion?.selectedCandidateIndex"
          @select="$emit('select')"
        />
      </template>
    </async-item-container>
  </app-virtual-list>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import { logger } from 'src/boot/logger';
import AsyncItemContainer from './AsyncItemContainer.vue';
import CompletionResultItem from './CompletionResultItem.vue';
import { to, type CompletionCandidate } from 'orgnote-api';
import { computed, nextTick, ref, watch } from 'vue';
import { DEFAULT_COMPLETION_ITEM_HEIGHT } from 'src/constants/completion-item';
import AppVirtualList from 'src/components/AppVirtualList.vue';
import type { AppVirtualListExpose, VisibleRange } from 'src/components/app-virtual-list.types';
import { buildCompletionDisplayModel } from './completion-grouping';

interface CandidateRange {
  readonly from: number;
  readonly size: number;
}

defineEmits<{
  select: [];
}>();

const completion = api.core.useCompletion();
const { config } = storeToRefs(api.core.useConfig());
const { activeCompletion } = storeToRefs(completion);

const scrollTarget = ref<AppVirtualListExpose | null>(null);
const pendingRanges = new Map<string, symbol>();

const buildRangeKey = (range: CandidateRange): string => `${range.from}-${range.size}`;

const resetPendingRanges = (): void => pendingRanges.clear();

let lastVisibleRange: VisibleRange | undefined;

watch(
  () => [activeCompletion.value, activeCompletion.value?.searchQuery],
  () => {
    resetPendingRanges();
    if (lastVisibleRange) loadVisibleCandidates(lastVisibleRange);
  },
);

const itemHeight = computed(
  () => activeCompletion.value?.itemHeight ?? DEFAULT_COMPLETION_ITEM_HEIGHT,
);

const hasLoadedAllCandidates = computed(() => {
  const candidates = activeCompletion.value?.candidates;
  const candidateTotal = activeCompletion.value?.total ?? 0;
  if (!candidates || candidates.length !== candidateTotal) return false;
  for (let index = 0; index < candidateTotal; index += 1) {
    if (!candidates[index]) return false;
  }
  return true;
});

const isGroupingEnabled = computed(
  () => Boolean(config.value?.completion?.showGroup && hasLoadedAllCandidates.value),
);

const displayModel = computed(() =>
  buildCompletionDisplayModel(
    activeCompletion.value?.candidates ?? [],
    isGroupingEnabled.value,
  ),
);

const getCandidateIndex = (displayIndex: number): number | undefined =>
  displayModel.value.displayToCandidateIndex[displayIndex];

const getCandidateDisplayIndex = (candidateIndex: number): number =>
  displayModel.value.candidateToDisplayIndex[candidateIndex] ?? candidateIndex;

const isRangeLoaded = (range: CandidateRange): boolean => {
  const candidates = activeCompletion.value?.candidates;
  if (!candidates?.length) return false;
  for (let index = 0; index < range.size; index += 1) {
    if (!candidates[range.from + index]) return false;
  }
  return true;
};

const isRangePending = (range: CandidateRange): boolean =>
  pendingRanges.has(buildRangeKey(range));

const markRangePending = (range: CandidateRange): symbol => {
  const requestId = Symbol(buildRangeKey(range));
  pendingRanges.set(buildRangeKey(range), requestId);
  return requestId;
};

const clearRangePending = (range: CandidateRange, requestId: symbol): void => {
  const rangeKey = buildRangeKey(range);
  if (pendingRanges.get(rangeKey) !== requestId) return;
  pendingRanges.delete(rangeKey);
};

const reportRangeFailure = (error: unknown, range: CandidateRange): void => {
  logger.error('Completion range search failed', { error, ...range });
};

const loadCandidateRange = async (range: CandidateRange): Promise<void> => {
  const requestId = markRangePending(range);
  const result = await to(completion.search)(range.size, range.from);
  clearRangePending(range, requestId);
  if (result.isErr()) reportRangeFailure(result.error, range);
};

const resolvePageRange = (pageStart: number, total: number): CandidateRange => ({
  from: pageStart,
  size: Math.min(config.value.completion.defaultCompletionLimit, total - pageStart),
});

const collectVisiblePages = (range: VisibleRange, total: number): CandidateRange[] => {
  const pageSize = config.value.completion.defaultCompletionLimit;
  const firstPage = Math.floor(range.start / pageSize);
  const lastPage = Math.floor(range.end / pageSize);
  return Array.from({ length: lastPage - firstPage + 1 }, (_, offset) =>
    resolvePageRange((firstPage + offset) * pageSize, total),
  );
};

const shouldLoadRange = (range: CandidateRange): boolean =>
  range.size > 0 && !isRangeLoaded(range) && !isRangePending(range);

const loadVisibleCandidates = (range: VisibleRange): void => {
  lastVisibleRange = range;
  if (isGroupingEnabled.value) return;
  const serverTotal = activeCompletion.value?.total ?? 0;
  collectVisiblePages(range, serverTotal).filter(shouldLoadRange).forEach(loadCandidateRange);
};

const total = computed(() => {
  const serverTotal = activeCompletion.value?.total ?? 0;
  const groupCount = displayModel.value.groupTitles.length;
  return serverTotal + groupCount;
});

const selectedDisplayIndex = computed(() => {
  const candidateIndex = activeCompletion.value?.selectedCandidateIndex;
  if (typeof candidateIndex !== 'number') return;
  return getCandidateDisplayIndex(candidateIndex);
});

watch(selectedDisplayIndex, async (displayIndex) => {
  if (typeof displayIndex !== 'number') return;
  await nextTick();
  scrollTarget.value?.scrollToIndex(displayIndex);
});

const candidatesAvailable = computed(() => {
  const type = activeCompletion.value?.type;
  return type ? ['choice', 'input-choice'].includes(type) : false;
});
</script>
