<template>
  <app-flex inline start class="org-tags" :class="{ wrap }" gap="sm">
    <app-badge
      v-for="tag in visibleTags"
      :key="tag"
      class="org-tag"
      :class="{ clickable }"
      color="accent"
      :size="badgeSize"
      @click="onTagClick(tag)"
    >
      {{ tag }}
    </app-badge>
    <app-badge v-if="overflowCount > 0" class="overflow-badge" color="accent" :size="badgeSize">
      +{{ overflowCount }}
    </app-badge>
  </app-flex>
</template>

<script lang="ts" setup>
import { NodeType } from 'org-mode-ast';
import type { OrgNode } from 'org-mode-ast';
import { DefaultCommands, type StyleSize } from 'orgnote-api';
import { api } from 'src/boot/api';
import AppBadge from 'src/components/AppBadge.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { computed } from 'vue';

const emit = defineEmits<{ 'tag-click': [tag: string] }>();

const props = withDefaults(
  defineProps<{
    node?: OrgNode;
    tags?: string[];
    clickable?: boolean;
    wrap?: boolean;
    badgeSize?: StyleSize;
    maxVisible?: number;
    searchOnClick?: boolean;
  }>(),
  {
    clickable: true,
    wrap: true,
    badgeSize: 'sm',
    searchOnClick: true,
  },
);

const rawTags = computed<string[]>(() => {
  if (props.tags?.length) return props.tags;
  return props.node?.children?.filter((n) => n.is(NodeType.Text)).map((n) => n.value) ?? [];
});

const visibleTags = computed(() =>
  props.maxVisible !== undefined ? rawTags.value.slice(0, props.maxVisible) : rawTags.value,
);

const overflowCount = computed(() =>
  props.maxVisible !== undefined ? Math.max(0, rawTags.value.length - props.maxVisible) : 0,
);

const onTagClick = (tag: string) => {
  if (!props.clickable) return;
  emit('tag-click', tag);
  if (props.searchOnClick)
    api.core.useCommands().execute(DefaultCommands.SEARCH, { searchText: tag });
};
</script>

<style lang="scss" scoped>
.org-tag {
  white-space: nowrap;

  &.clickable {
    cursor: pointer;
  }
}

.org-tags {
  max-width: 100%;
  align-items: flex-start;

  &.wrap {
    flex-wrap: wrap;
  }
}
</style>
