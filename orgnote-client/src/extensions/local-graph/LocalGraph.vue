<template>
  <div class="local-graph">
    <app-graph
      v-if="localGraph.graph.nodes.length"
      class="local-graph-canvas"
      :graph="localGraph.graph"
      :graph-config="graphConfig"
      :dim-unrelated="false"
      :selected-node-id="currentNodeId"
      :highlighted-node-ids="highlightedNodeIds"
      :max-zoom="LOCAL_GRAPH_MAX_ZOOM"
      :fit-on-graph-change="true"
      @node-click="handleNodeClick"
      @node-hover="hoveredNodeId = $event"
    />
    <empty-state
      v-else
      icon="sym_o_hub"
      :title="t(i18n.GRAPH_EMPTY_TITLE)"
      :description="t(i18n.GRAPH_EMPTY_DESCRIPTION)"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { buildBufferUri, i18n } from 'orgnote-api';
import { api } from 'src/boot/api';
import type { GraphUiConfig } from 'orgnote-api';
import { useConfigStore } from 'src/stores/config';
import { DEFAULT_GRAPH_CONFIG } from 'src/constants/graph-defaults';
import type { GraphBuildResult, GraphNodeViewModel } from 'src/models/graph';
import AppGraph from 'src/components/graph/AppGraph.vue';
import EmptyState from 'src/components/EmptyState.vue';
import { buildGraphFromFileMetas } from 'src/utils/build-graph';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const { activeContext } = storeToRefs(api.core.useEditor());

const LOCAL_GRAPH_MAX_ZOOM = 0.95;

const EMPTY_GRAPH: GraphBuildResult = { graph: { nodes: [], edges: [] }, adjacency: {} };
const localGraph = ref<GraphBuildResult>(EMPTY_GRAPH);

const { config } = storeToRefs(useConfigStore());

const graphConfig = computed<GraphUiConfig>(() => ({
  ...DEFAULT_GRAPH_CONFIG,
  ...config.value.ui.graph,
}));

const currentNodeId = computed(
  () => localGraph.value.graph.nodes.find((n) => n.path === activeContext.value?.filePath)?.id,
);

const hoveredNodeId = ref<string>();

const highlightedNodeIds = computed(() => {
  if (!hoveredNodeId.value) return [];
  return [hoveredNodeId.value];
});

const loadLocalGraph = async (filePath: string): Promise<void> => {
  const pathParts = filePath.split('/').filter(Boolean);
  const meta = await api.core.useFileMeta().getByPath(pathParts);
  if (!meta) {
    localGraph.value = EMPTY_GRAPH;
    return;
  }

  const neighborIds = [...(meta.links ?? []), ...(meta.backlinks ?? [])];
  const neighbors = await api.core.useFileMeta().getByIds(neighborIds);
  localGraph.value = buildGraphFromFileMetas([meta, ...neighbors]);
};

const handleNodeClick = async (node: GraphNodeViewModel): Promise<void> => {
  await api.core.useBufferViewer().open(buildBufferUri('file', node.path));
};

watch(
  () => activeContext.value?.filePath,
  (filePath) => {
    if (filePath) loadLocalGraph(filePath);
    else localGraph.value = EMPTY_GRAPH;
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.local-graph {
  width: 100%;
}

.local-graph-canvas {
  width: 100%;
  aspect-ratio: 1;

  :deep(.app-graph) {
    min-height: unset;
    height: 100%;
    background: transparent;
    border: none;
  }

  :deep(.graph-canvas) {
    min-height: unset;
  }
}
</style>
