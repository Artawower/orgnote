<template>
  <app-code :code="codeContent" />
</template>

<script setup lang="ts">
import type { OrgNode } from 'org-mode-ast';
import AppCode from 'src/components/AppCode.vue';
import { computed } from 'vue';
import { getSrcBlockCode } from './src-block-node';

const props = defineProps<{
  node: OrgNode;
  nodeGetter?: () => OrgNode;
}>();

const currentNode = computed(() => props.nodeGetter?.() ?? props.node);
const codeContent = computed(() => getSrcBlockCode(currentNode.value));
</script>
