<template>
  <component :is="container" class="org-latex" v-katex:display="latexFormula" />
</template>

<script setup lang="ts">
import type { OrgNode } from 'org-mode-ast';
import { NodeType } from 'org-mode-ast';
import { computed } from 'vue';

const props = defineProps<{
  node: OrgNode;
  nodeGetter?: () => OrgNode;
  container?: string;
}>();

const currentNode = computed(() => props.nodeGetter?.() ?? props.node);

const formulaIndex = computed(() => (currentNode.value.is(NodeType.LatexFragment) ? 1 : 2));

const latexFormula = computed(
  () => currentNode.value.children?.get(formulaIndex.value)?.rawValue ?? currentNode.value.value,
);

const container = computed(() => props.container ?? 'div');
</script>

<style lang="scss">
.org-latex {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
}

.katex-display {
  padding: 0;
  margin: 0;
  overflow-x: auto;
  overflow-y: hidden;

  > .katex {
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding: var(--padding-sm) 0;
  }
}
</style>
