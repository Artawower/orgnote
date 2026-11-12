<template>
  <app-flex class="item" column start align-start gap="xs">
    <div class="item-title text-medium color-main line-limit-1">{{ resolvedTitle }}</div>
    <div class="item-description text-italic color-secondary line-limit-2">
      <template v-if="props.candidate.data.updatedAt">
        {{ prettyDate(props.candidate.data.updatedAt) }} <template v-if="secondaryLine">,</template>
      </template>
      {{ secondaryLine }}
    </div>
    <div class="item-meta color-secondary">
      <org-tags
        v-if="normalizedTags.length"
        class="item-tags"
        :tags="normalizedTags"
        :clickable="false"
        :wrap="false"
        badge-size="xs"
      />
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import type { CompletionItemRendererProps, FileMeta } from 'orgnote-api';
import { computed, toValue } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';
import OrgTags from 'src/components/org-nodes/OrgTags.vue';
import { usePrettyDate } from 'src/composables/use-pretty-date';

const props = defineProps<CompletionItemRendererProps<FileMeta>>();
const { prettyDate } = usePrettyDate();

const resolvedTitle = computed(() => toValue(props.candidate.title));

const fileDescription = computed(() => props.candidate.data.description?.trim() ?? '');

const normalizedTags = computed(() =>
  (props.candidate.data.tags ?? []).filter((tag) => tag.trim().length > 0).map((tag) => `#${tag}`),
);

const pathLine = computed(() => {
  const path = props.candidate.data.filePath ?? [];
  if (path.length <= 1) {
    return '';
  }
  return path.slice(0, -1).join('/');
});

const secondaryLine = computed(() => {
  if (fileDescription.value) {
    return fileDescription.value;
  }

  if (pathLine.value) {
    return pathLine.value;
  }

  return '';
});
</script>

<style lang="scss" scoped>
.item {
  flex: 1;
  min-width: 0;
  padding: var(--completion-item-padding);
  height: 100%;
}

.item-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
}

.item-description,
.item-meta {
  font-size: var(--font-size-md);
  width: 100%;
  min-width: 0;
  padding: 0;
}

.item-description {
  line-height: var(--line-height-sm);
}

.item-meta {
  display: flex;
  align-items: center;
}

.item-tags {
  min-width: 0;
  color: inherit;
}
</style>
