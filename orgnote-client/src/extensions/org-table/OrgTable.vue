<template>
  <EasyDataTable
    class="org-table"
    :headers="headers"
    :items="items"
    hide-footer
    header-text-direction="left"
    body-text-direction="left"
  >
    <template v-for="h of headers" #[`header-${h.value}`]="slotProps" :key="h.value">
      <span class="header-text">
        {{ slotProps.value }}
        <q-tooltip :delay="tooltipDelay">
          <span class="color-reverse">{{ slotProps.value }}</span>
        </q-tooltip>
      </span>
    </template>
    <template v-for="h of headers" #[`item-${h.value}`]="slotProps" :key="h.value">
      <content-renderer :node="slotProps[h.value]" />
    </template>
  </EasyDataTable>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NodeType, type OrgNode } from 'org-mode-ast';
import type { Header, Item } from 'vue3-easy-data-table';
import { storeToRefs } from 'pinia';

import ContentRenderer from 'src/components/ContentRenderer.vue';
import EasyDataTable from 'vue3-easy-data-table';
import { useConfigStore } from 'src/stores/config';

const props = defineProps<{
  node: OrgNode;
  nodeGetter?: () => OrgNode;
}>();

const { config } = storeToRefs(useConfigStore());
const tooltipDelay = computed(() => config.value.ui.tooltipDelay);

const currentNode = computed(() => props.nodeGetter?.() ?? props.node);

const headers = computed<Header[]>(() =>
  (currentNode.value.children?.first?.children ?? [])
    .filter((n: OrgNode) => n.is(NodeType.TableCell))
    .map((h: OrgNode) => {
      const rawText = h.rawValue;
      return {
        value: rawText,
        text: rawText,
      };
    }),
);

const items = computed<Item[]>(() =>
  (currentNode.value.children ?? [])
    .slice(1)
    .filter((n: OrgNode) => n.is(NodeType.TableRow))
    .map((row: OrgNode) => {
      const children = row.children ?? [];
      const item: Item = {};

      children
        .filter((n: OrgNode) => n.is(NodeType.TableCell))
        .forEach((c: OrgNode, i: number) => {
          if (i < headers.value.length) {
            item[headers.value[i]!.value] = c;
          }
        });

      return item;
    }),
);
</script>

<style lang="scss" scoped>
.org-table {
  td {
    min-width: 140px;
  }

  .header-text {
    @include line-limit(1);
    font-weight: var(--font-weight-bold);
  }
}

.org-embedded-table {
  display: block;
  width: 100%;
  overflow-x: auto;
}
</style>
