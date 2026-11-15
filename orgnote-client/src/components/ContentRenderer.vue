<template>
  <template v-if="node?.value">
    <component v-if="node && node.type" :is="getComponent(node.type)" :node="node" />
  </template>
  <template v-else>
    <template v-for="n of node?.children" :key="n.position">
      <component :is="getComponent(n.type)" :node="n" />
    </template>
  </template>
</template>

<script setup lang="ts">
import { NodeType, type OrgNode } from 'org-mode-ast';
import { toRef, type Component } from 'vue';

import {
  OrgBold,
  OrgItalic,
  OrgStrikeThrough,
  OrgText,
  OrgNewLine,
  OrgEntity,
  OrgInlineCode,
  OrgLink,
  OrgRawLink,
} from './org-nodes';

const typedComponents: Partial<Record<NodeType, Component>> = {
  [NodeType.Bold]: OrgBold,
  [NodeType.Italic]: OrgItalic,
  [NodeType.Crossed]: OrgStrikeThrough,
  [NodeType.Text]: OrgText,
  [NodeType.NewLine]: OrgNewLine,
  [NodeType.Entity]: OrgEntity,
  [NodeType.Verbatim]: OrgInlineCode,
  [NodeType.InlineCode]: OrgInlineCode,
  [NodeType.Link]: OrgLink,
  [NodeType.RawLink]: OrgRawLink,
};

const getComponent = (type: NodeType): Component | undefined => typedComponents[type];

const props = defineProps<{
  node: Partial<OrgNode>;
}>();

const node = toRef(props, 'node');
</script>
