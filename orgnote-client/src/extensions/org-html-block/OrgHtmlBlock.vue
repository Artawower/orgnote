<template>
  <div v-html-safe="htmlContent" class="org-html-block" />
</template>

<script setup lang="ts">
import type { OrgNode } from 'org-mode-ast';
import { computed } from 'vue';

const props = defineProps<{
  node: OrgNode;
  nodeGetter?: () => OrgNode;
}>();

const currentNode = computed(() => props.nodeGetter?.() ?? props.node);
const htmlContent = computed(() => currentNode.value.children?.get(2)?.rawValue ?? '');
</script>

<style lang="scss" scoped>
.org-html-block {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
}
</style>
