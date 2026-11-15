<template>
  <div class="org-quote-wrapper">
    <blockquote class="org-quote">
      <p v-for="(child, i) in quoteChildren" :key="i">
        <content-renderer :node="child" />
      </p>
    </blockquote>
  </div>
</template>

<script setup lang="ts">
import type { OrgNode } from 'org-mode-ast';
import { computed } from 'vue';
import ContentRenderer from 'src/components/ContentRenderer.vue';

const props = defineProps<{
  node: OrgNode;
  nodeGetter?: () => OrgNode;
}>();

const currentNode = computed(() => props.nodeGetter?.() ?? props.node);
const quoteChildren = computed(() => currentNode.value?.children?.get(2)?.children ?? []);
</script>

<style scoped lang="scss">
.org-quote-wrapper {
  padding-left: var(--editor-line-left-padding);
}

.org-quote {
  display: block;
  border-left: 3px solid var(--accent);
  padding-left: var(--padding-lg);
  margin: 0;
  font-style: italic;

  p {
    margin: 0;
  }
}
</style>
