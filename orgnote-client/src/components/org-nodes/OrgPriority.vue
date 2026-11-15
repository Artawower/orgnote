<template>
  <span class="org-priority" :class="`org-priority-${priorityLevel}`">
    <app-icon :name="icon" size="sm" />
  </span>
</template>

<script lang="ts" setup>
import type { OrgNode } from 'org-mode-ast';
import { computed } from 'vue';
import AppIcon from '../AppIcon.vue';

const props = defineProps<{
  node: OrgNode;
}>();

const PRIORITY_ICONS: Record<string, string> = {
  '#A': 'looks_one',
  '#B': 'looks_two',
  '#C': 'looks_3',
  '#D': 'looks_4',
  '#E': 'looks_5',
  '#F': 'looks_6',
};

const priority = computed(() => props.node.children?.get(1)?.value ?? '');
const icon = computed(() => PRIORITY_ICONS[priority.value.toUpperCase()] ?? 'priority_high');
const priorityLevel = computed(() => priority.value.replace('#', '').toLowerCase());
</script>
<style lang="scss" scoped>
.org-priority {
  position: relative;
  display: inline-block;
  // TODO: resarch this hack
  bottom: 2px;
}
</style>
