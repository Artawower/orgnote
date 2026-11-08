<template>
  <app-flex column start align-start gap="md" class="org-ast-debugger">
    <div class="debugger-header">
      <span class="debugger-label">Cursor:</span>
      <span class="debugger-value">{{ cursorPosition }}</span>
    </div>
    <div v-if="orgNode" v-html-safe="formattedTree" class="debugger-tree" />
    <div v-else class="debugger-empty">No active editor</div>
  </app-flex>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { walkTree, type OrgNode } from 'org-mode-ast';
import { api } from 'src/boot/api';
import { storeToRefs } from 'pinia';
import AppFlex from './AppFlex.vue';
import { escapeHtml } from 'src/utils/escape-html';

const editorStore = api.core.useEditor();
const { activeContext } = storeToRefs(editorStore);

const orgNode = computed(() => activeContext.value?.orgNode);
const cursorPosition = computed(() => activeContext.value?.cursorPosition ?? 0);

const findNodeAtCursor = (node: OrgNode, position: number): OrgNode | null => {
  let foundNode: OrgNode | null = null;
  walkTree(node, (n: OrgNode) => {
    if (n.start <= position && n.end >= position) {
      foundNode = n;
    }
    return false;
  });
  return foundNode;
};

const formattedTree = computed(() => {
  const node = orgNode.value;
  if (!node) return '';

  const selectedNode = findNodeAtCursor(node, cursorPosition.value);
  const [start, end] = [selectedNode?.start, selectedNode?.end];
  const escaped = escapeHtml(node.toString());

  return escaped.replace(
    `[${start}-${end}]`,
    `<span class="highlighted-range">[${start}-${end}]</span>`,
  );
});
</script>

<style lang="scss" scoped>
.org-ast-debugger {
  height: 100%;
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-sm);
  padding: var(--padding-lg) var(--padding-md);
}

.debugger-header {
  border-bottom: 1px solid var(--base-border);
  flex-shrink: 0;
}

.debugger-label {
  color: var(--fg-muted);
  margin-right: var(--gap-xs);
}

.debugger-value {
  color: var(--fg-accent);
  font-weight: 500;
}

.debugger-tree {
  flex: 1;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: var(--line-height-md);
  width: 100%;

  :deep(.highlighted-range) {
    background-color: var(--yellow);
    color: var(--base2);
    border-radius: var(--border-radius-xs);
    padding: 0 var(--padding-xs);
  }
}

.debugger-empty {
  padding: var(--gap-md);
  color: var(--fg-muted);
  text-align: center;
}
</style>
