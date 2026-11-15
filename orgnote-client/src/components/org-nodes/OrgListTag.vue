<template>
  <span class="org-list-tag">{{ tag }}</span>
</template>

<script lang="ts" setup>
import type { OrgNode } from 'org-mode-ast';
import { computed } from 'vue';

const props = defineProps<{
  node: OrgNode;
}>();

const tag = computed(() => props.node.value);
</script>

<style lang="scss" scoped>
.org-list-tag {
  font-weight: 600;
  margin-left: var(--padding-sm);
}
</style>
