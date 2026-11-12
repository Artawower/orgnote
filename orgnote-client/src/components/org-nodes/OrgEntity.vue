<template>
  <span class="org-entity">{{ node.value }}</span>
</template>

<script lang="ts" setup>
import type { OrgNode } from 'org-mode-ast';

defineProps<{
  node: OrgNode;
}>();
</script>

<style scoped>
.org-entity {
  color: var(--orange);
}
</style>
