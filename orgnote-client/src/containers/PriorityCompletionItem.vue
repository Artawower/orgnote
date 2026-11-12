<template>
  <app-flex class="priority-item" row align-center gap="xs">
    <span :class="['priority-mark', priorityClass]">{{ priorityMark }}</span>
    <span class="priority-label">{{ priorityLabel }}</span>
  </app-flex>
</template>

<script lang="ts" setup>
import type { CompletionItemRendererProps } from 'orgnote-api';
import { computed, toValue } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';

const props = defineProps<CompletionItemRendererProps<string>>();

const label = computed(() => toValue(props.candidate.title) ?? '');
const priorityLetter = computed(() => props.candidate.data?.trim() || null);

const priorityMark = computed(() => (priorityLetter.value ? `[#${priorityLetter.value}]` : ''));

const priorityLabel = computed(() => label.value.replace(/\[#[A-Z]\]\s*/, '').trim());

const priorityClass = computed(() =>
  priorityLetter.value ? `priority-${priorityLetter.value.toLowerCase()}` : 'priority-none',
);
</script>

<style lang="scss" scoped>
.priority-item {
  padding: var(--completion-item-padding);
  height: 100%;
}

.priority-mark {
  font-weight: var(--font-weight-medium);
  min-width: 3em;
}

@include org-priority-colors;

.priority-none {
  color: var(--fg-muted);
}
</style>
