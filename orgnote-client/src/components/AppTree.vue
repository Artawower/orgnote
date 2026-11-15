<template>
  <q-tree
    ref="treeRef"
    class="app-tree"
    :nodes="nodes"
    :node-key="nodeKey"
    :label-key="labelKey"
    :children-key="childrenKey"
    :no-connectors="noConnectors"
    :default-expand-all="defaultExpandAll"
    :selected="selected"
    @update:selected="handleSelectedUpdate"
    @lazy-load="$emit('lazyLoad', $event)"
  >
    <template #default-header="scope">
      <slot
        name="node"
        :node="scope.node"
        :expanded="scope.expanded"
        :toggle="() => scope.tree.setExpanded(scope.key, !scope.tree.isExpanded(scope.key))"
      >
        <div
          class="app-tree-node"
          :class="{ active: scope.node[nodeKey] === selected }"
          @click="handleNodeClick(scope.node)"
        >
          <app-icon v-if="scope.node.icon" :name="scope.node.icon" size="xs" />
          <overflow-line class="app-tree-label">{{ scope.node[labelKey] }}</overflow-line>
        </div>
      </slot>
    </template>
  </q-tree>
</template>

<script lang="ts" setup generic="T extends Record<string, unknown>">
import { ref } from 'vue';
import { QTree } from 'quasar';
import AppIcon from './AppIcon.vue';
import OverflowLine from './OverflowLine.vue';

const treeRef = ref<InstanceType<typeof QTree> | null>(null);

const props = withDefaults(
  defineProps<{
    nodes: T[];
    nodeKey?: string;
    labelKey?: string;
    childrenKey?: string;
    noConnectors?: boolean;
    defaultExpandAll?: boolean;
    selected?: string | number | null;
  }>(),
  {
    nodeKey: 'id',
    labelKey: 'label',
    childrenKey: 'children',
    noConnectors: true,
    defaultExpandAll: false,
    selected: null,
  },
);

const emit = defineEmits<{
  'update:selected': [value: string | number | null];
  lazyLoad: [details: { node: T; done: (children?: T[]) => void; fail: () => void }];
  nodeClick: [node: T];
}>();

const normalizeSelection = (value: unknown): string | number | null => {
  if (typeof value === 'string' || typeof value === 'number') return value;
  return null;
};

const handleSelectedUpdate = (value: unknown) => {
  emit('update:selected', normalizeSelection(value));
};

const toggleNodeExpansion = (node: T): void => {
  const key = node[props.nodeKey];
  if (!treeRef.value || (typeof key !== 'string' && typeof key !== 'number')) return;
  const stringKey = String(key);
  treeRef.value.setExpanded(stringKey, !treeRef.value.isExpanded(stringKey));
};

const handleNodeClick = (node: T) => {
  const value = node[props.nodeKey];
  handleSelectedUpdate(value);
  emit('nodeClick', node);
  toggleNodeExpansion(node);
};
</script>

<style lang="scss" scoped>
.app-tree {
  width: 100%;

  :deep(.q-tree__node-header) {
    padding: 0;
  }

  :deep(.q-tree__node) {
    padding: 0 0 0 22px;
  }

  :deep(.q-tree__children) {
    padding-left: var(--padding-md);
  }

  :deep(.q-tree__node--parent) {
    position: relative;
  }

  :deep(.q-tree__node--selected),
  :deep(.q-tree__node-header),
  :deep(.q-hoverable),
  :deep(.q-focusable) {
    position: unset !important;
  }

  :deep(.q-tree__node--selected) {
    &::after {
      content: '';
      display: block;
      position: absolute;
      width: var(--padding-sm);
      height: 100%;
      background: var(--accent);
      top: 0;
      left: 0;
      z-index: 5;
      border-radius: var(--border-radius-md);
    }
  }
}

.app-tree-node {
  @include interactive-no-select;
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: var(--padding-md);
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  width: 100%;

  @include hover {
    background-color: var(--menu-item-hover-bg);
  }

  &.active {
    color: var(--accent);
    background-color: var(--menu-item-active-bg);
  }
}
</style>
