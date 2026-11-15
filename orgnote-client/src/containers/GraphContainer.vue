<template>
  <div class="graph-container">
    <div v-if="selectedNode" class="graph-selection">
      <div class="selection-label">{{ t(i18n.GRAPH_SELECTED_LABEL) }}</div>
      <div class="selection-title">{{ selectedNode.label }}</div>
      <div class="selection-path">{{ selectedNode.path }}</div>
    </div>

    <app-flex v-if="loading" center align-center class="graph-surface state-wrapper">
      <linear-progress />
    </app-flex>

    <app-flex v-else-if="error" center align-center class="graph-surface state-wrapper">
      <empty-state icon="sym_o_error" :title="t(i18n.GRAPH_ERROR_TITLE)" :description="error" />
    </app-flex>

    <app-graph
      v-else
      class="graph-surface"
      :graph="graph.graph"
      :graph-config="graphUserConfig"
      :selected-node-id="selectedNodeId"
      :highlighted-node-ids="highlightedNodeIds"
      :max-zoom="graphMaxZoom"
      @node-click="handleNodeClick"
      @node-hover="handleNodeHover"
      @background-click="clearSelection"
    />

    <command-action-button
      class="graph-settings-btn"
      :command="DefaultCommands.GRAPH_SETTINGS"
      :data="graphSettingsData"
    />
  </div>
</template>

<script lang="ts" setup>
import { buildBufferUri, DefaultCommands } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { I18N as i18n } from 'orgnote-api';
import { api } from 'src/boot/api';
import AppFlex from 'src/components/AppFlex.vue';
import EmptyState from 'src/components/EmptyState.vue';
import LinearProgress from 'src/components/LinearProgress.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import AppGraph from 'src/components/graph/AppGraph.vue';
import { buildGraphFromFileMetas } from 'src/utils/build-graph';
import type { GraphBuildResult, GraphNodeViewModel } from 'src/models/graph';
import { storeToRefs } from 'pinia';
import type { GraphUiConfig } from 'orgnote-api';
import { DEFAULT_GRAPH_CONFIG } from 'src/constants/graph-defaults';
import { debounce } from 'src/utils/debounce';
import { affectsOrgIndex } from 'src/utils/org-fs-change';
import type { FileSystemChange } from 'orgnote-api';

const GRAPH_REFRESH_DEBOUNCE_MS = 300;
const SINGLE_NODE_GRAPH_MAX_ZOOM = 1.2;

const EMPTY_GRAPH: GraphBuildResult = {
  graph: {
    nodes: [],
    edges: [],
  },
  adjacency: {},
};

const { t } = useI18n();
const { config } = storeToRefs(api.core.useConfig());

const graphUserConfig = computed<GraphUiConfig>(() => ({
  ...DEFAULT_GRAPH_CONFIG,
  ...config.value.ui.graph,
}));
const graph = ref<GraphBuildResult>(EMPTY_GRAPH);
const loading = ref(false);
const error = ref<string>();
const hoveredNodeId = ref<string>();
const manualSelectedNodeId = ref<string>();

const loadGraph = async (silent = false): Promise<void> => {
  if (!silent) {
    loading.value = true;
    error.value = undefined;
  }

  const result = await to(api.core.useFileMeta().getAll)();

  if (!silent) loading.value = false;

  if (result.isErr()) {
    if (!silent) error.value = result.error.message;
    return;
  }

  error.value = undefined;
  graph.value = buildGraphFromFileMetas(result.value.filter((f) => !f.deletedAt));
};

const refreshGraph = debounce(() => void loadGraph(true), GRAPH_REFRESH_DEBOUNCE_MS);

const handleFsChange = (change: FileSystemChange): void => {
  if (!affectsOrgIndex(change)) return;
  refreshGraph();
};

const activeNodeId = computed(() => {
  const activeFilePath = api.core.useEditor().activeContext?.filePath;
  if (!activeFilePath) {
    return undefined;
  }

  return graph.value.graph.nodes.find((node) => node.path === activeFilePath)?.id;
});

const selectedNodeId = computed(() => manualSelectedNodeId.value ?? activeNodeId.value);

const highlightedNodeIds = computed(() => {
  const focusId = hoveredNodeId.value ?? selectedNodeId.value;
  if (!focusId) {
    return [];
  }

  return [focusId, ...(graph.value.adjacency[focusId] ?? [])];
});

const graphMaxZoom = computed(() => {
  if (graph.value.graph.nodes.length !== 1) return undefined;
  return SINGLE_NODE_GRAPH_MAX_ZOOM;
});

const selectedNode = computed(() => {
  const currentId = selectedNodeId.value;
  if (!currentId) {
    return undefined;
  }

  return graph.value.graph.nodes.find((node) => node.id === currentId);
});

const clearSelection = (): void => {
  manualSelectedNodeId.value = undefined;
  hoveredNodeId.value = undefined;
};

const handleNodeHover = (nodeId?: string): void => {
  hoveredNodeId.value = nodeId;
};

const handleNodeClick = async (node: GraphNodeViewModel): Promise<void> => {
  manualSelectedNodeId.value = node.id;
  await api.core.useBufferViewer().open(buildBufferUri('file', node.path));
};

const graphSettingsData = computed(() => ({
  nodesCount: graph.value.graph.nodes.length,
  edgesCount: graph.value.graph.edges.length,
  config: graphUserConfig.value,
  refresh: () => loadGraph(),
  configChange: (cfg: GraphUiConfig) => {
    config.value.ui.graph = cfg;
  },
}));

let stopWatch: (() => void) | undefined;

onMounted(() => {
  void loadGraph();
  stopWatch = api.core.useFileWatcher().watch('/', handleFsChange, { recursive: true });
});

onUnmounted(() => {
  stopWatch?.();
  refreshGraph.cancel();
});
</script>

<style lang="scss" scoped>
.graph-container {
  position: relative;
  height: 100%;
  min-height: 0;
}

.graph-selection {
  position: absolute;
  top: var(--padding-md);
  left: var(--padding-md);
  z-index: 1;
  border: var(--border-default);
  border-radius: var(--border-radius-md);
  background: color-mix(in srgb, var(--bg-alt) 72%, var(--bg));
  padding: var(--padding-md);

  .selection-label {
    color: var(--fg-muted);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .selection-title {
    color: var(--fg);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .selection-path {
    color: var(--fg-muted);
    font-size: var(--font-size-sm);
    word-break: break-all;
  }
}

.graph-surface {
  width: 100%;
  height: 100%;
  min-height: var(--graph-surface-min-height);

  &.state-wrapper {
    border: var(--border-default);
    border-radius: var(--border-radius-lg);
    padding: var(--page-padding);
  }
}

.graph-settings-btn {
  position: absolute;
  bottom: var(--padding-md);
  right: var(--padding-md);
  z-index: 1;

  @include tablet-below {
    bottom: calc(var(--footer-height) + var(--footer-wrapper-padding-y) * 2 + var(--padding-md));
  }
}
</style>
