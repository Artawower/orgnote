<template>
  <app-flex class="tag-item" row align-center gap="xs">
    <span class="tag-label">:{{ tagName }}:</span>
  </app-flex>
</template>

<script lang="ts" setup>
import type { CompletionItemRendererProps } from 'orgnote-api';
import { computed, toValue } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';

const props = defineProps<CompletionItemRendererProps<string>>();

const tagName = computed(() => toValue(props.candidate.title) ?? '');
</script>

<style lang="scss" scoped>
.tag-item {
  padding: var(--completion-item-padding);
  height: 100%;
}

.tag-label {
  color: var(--accent);
  font-weight: var(--font-weight-medium);
}
</style>
