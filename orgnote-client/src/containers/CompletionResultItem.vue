<template>
  <app-flex
    class="group-title"
    v-if="'groupTitle' in item"
    direction="row"
    justify="center"
    align="center"
  >
    {{ item.groupTitle }}
  </app-flex>
  <app-flex
    v-else
    class="completion-item"
    :class="{ selected: selected ?? false }"
    row
    start
    align-center
    @click="selectCandidate"
  >
    <component
      :is="itemRenderer"
      :candidate="item"
      :index="candidateIndex"
      :selected="selected ?? false"
      :search-query="searchQuery"
      :on-select="selectCandidate"
    />
  </app-flex>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { api } from 'src/boot/api';
import type { GroupedCompletionCandidate } from 'src/models/grouped-completion-candidate';
import type { CompletionItemRenderer } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';
import CompletionResultDefaultItem from 'src/containers/CompletionResultDefaultItem.vue';

const props = defineProps<{
  item: GroupedCompletionCandidate;
  selected?: boolean;
  index: number;
}>();

const emit = defineEmits<{
  select: [];
}>();

const completion = api.core.useCompletion();

const candidateIndex = computed(() => {
  if ('groupTitle' in props.item) {
    return props.index;
  }

  return props.item.index ?? props.index;
});

const itemRenderer = computed<CompletionItemRenderer>(
  () => completion.activeCompletion?.itemRenderer ?? CompletionResultDefaultItem,
);

const searchQuery = computed(() => completion.activeCompletion?.searchQuery ?? '');

const applyCandidateToInput = (index: number) => {
  const activeCompletion = completion.activeCompletion;
  if (!activeCompletion) {
    return;
  }

  const candidate = activeCompletion.candidates?.[index];
  if (!candidate) {
    return;
  }

  activeCompletion.selectedCandidateIndex = index;

  if (activeCompletion.type === 'choice') {
    candidate.commandHandler?.(candidate.data);
    emit('select');
    return;
  }

  completion.acceptAutocomplete();
  emit('select');
};

const selectCandidate = () => applyCandidateToInput(candidateIndex.value);
</script>

<style lang="scss" scoped>
.completion-item {
  & {
    @include fit;
    @include interactive-no-select;
    cursor: pointer;
    border-radius: var(--completion-item-radius);
    box-sizing: border-box;
    overflow: hidden;
  }

  &.selected {
    background: color-mix(in srgb, var(--fg), var(--bg) 90%);
  }

  @include hover {
    background: color-mix(in srgb, var(--fg), var(--bg) 90%);
  }

  &:active {
    background: color-mix(in srgb, var(--fg), var(--bg) 90%);
  }
}

.group-title {
  & {
    height: 100%;
    font-weight: bold;
    color: var(--fg-muted);
    background: var(--bg-elevated);
    @include interactive-no-select;
  }
}
</style>
