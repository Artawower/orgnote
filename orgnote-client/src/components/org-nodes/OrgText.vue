<template>
  <span class="org-text">{{ node.value }}</span>
</template>

<script setup lang="ts">
import type { OrgNode } from 'org-mode-ast';
import { toRef } from 'vue';

const props = defineProps<{
  node: OrgNode;
}>();

const node = toRef(props, 'node');
</script>
