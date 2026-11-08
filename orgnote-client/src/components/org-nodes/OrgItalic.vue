<template>
  <i>
    <content-renderer :node="node" />
  </i>
</template>

<script setup lang="ts">
import type { OrgNode } from 'org-mode-ast';
import { toRef } from 'vue';
import ContentRenderer from '../ContentRenderer.vue';

const props = defineProps<{
  node: OrgNode;
}>();

const node = toRef(props, 'node');
</script>
