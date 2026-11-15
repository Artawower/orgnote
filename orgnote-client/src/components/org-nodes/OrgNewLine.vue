<template>
  <br v-if="showNewLine" />
</template>

<script setup lang="ts">
import { NodeType, type OrgNode } from 'org-mode-ast';

const props = defineProps<{
  node: OrgNode;
}>();

const showNewLine =
  props.node.prev?.isNot(
    NodeType.NewLine,
    NodeType.Keyword,
    NodeType.Property
  ) && props.node.parent?.isNot(NodeType.PropertyDrawer, NodeType.QuoteBlock);
</script>
