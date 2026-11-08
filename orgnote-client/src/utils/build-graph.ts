import type { FileMeta } from 'orgnote-api';
import type { GraphBuildResult, GraphEdgeViewModel, GraphNodeViewModel } from 'src/models/graph';

const PATH_SEPARATOR = '/';
const ROOT_PATH_PREFIX = '/';
const MIN_NODE_WEIGHT = 1;

const toPath = (filePath: string[]): string =>
  `${ROOT_PATH_PREFIX}${filePath.join(PATH_SEPARATOR)}`;

const toLabel = (meta: FileMeta): string => {
  if (meta.title?.trim()) return meta.title.trim();
  return meta.filePath.at(-1) ?? meta.id;
};

const createNode = (meta: FileMeta, weight: number): GraphNodeViewModel => ({
  id: meta.id,
  label: toLabel(meta),
  weight,
  path: toPath(meta.filePath),
});

const createAdjacency = (ids: string[]): Record<string, string[]> =>
  Object.fromEntries(ids.map((id) => [id, []]));

const createEdgeId = (source: string, target: string): string =>
  source < target ? `${source}::${target}` : `${target}::${source}`;

const appendNeighbor = (
  adjacency: Record<string, string[]>,
  source: string,
  target: string,
): void => {
  const neighbors = adjacency[source];
  if (!neighbors || neighbors.includes(target)) return;
  neighbors.push(target);
};

const createEdge = (source: string, target: string): GraphEdgeViewModel => ({
  id: createEdgeId(source, target),
  source,
  target,
});

const createBacklinkEdges = (meta: FileMeta): Array<readonly [string, string]> =>
  (meta.backlinks ?? []).map((sourceId) => [sourceId, meta.id] as const);

const createForwardEdges = (meta: FileMeta): Array<readonly [string, string]> =>
  (meta.links ?? []).map((targetId) => [meta.id, targetId] as const);

const collectEdgePairs = (meta: FileMeta): Array<readonly [string, string]> => [
  ...createForwardEdges(meta),
  ...createBacklinkEdges(meta),
];

const applyEdgePair = (
  sourceId: string,
  targetId: string,
  nodeIds: Set<string>,
  edgesById: Map<string, GraphEdgeViewModel>,
  weights: Map<string, number>,
): void => {
  if (sourceId === targetId) return;
  if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return;

  const edgeId = createEdgeId(sourceId, targetId);
  if (edgesById.has(edgeId)) return;

  weights.set(sourceId, (weights.get(sourceId) ?? MIN_NODE_WEIGHT) + 1);
  weights.set(targetId, (weights.get(targetId) ?? MIN_NODE_WEIGHT) + 1);
  edgesById.set(edgeId, createEdge(sourceId, targetId));
};

const buildEdgesAndWeights = (
  metas: readonly FileMeta[],
  nodeIds: Set<string>,
): { edgesById: Map<string, GraphEdgeViewModel>; weights: Map<string, number> } => {
  const edgesById = new Map<string, GraphEdgeViewModel>();
  const weights = new Map<string, number>(Array.from(nodeIds).map((id) => [id, MIN_NODE_WEIGHT]));

  metas
    .flatMap(collectEdgePairs)
    .forEach(([sourceId, targetId]) =>
      applyEdgePair(sourceId, targetId, nodeIds, edgesById, weights),
    );

  return { edgesById, weights };
};

const sortNodes = (nodes: GraphNodeViewModel[]): GraphNodeViewModel[] =>
  [...nodes].sort((l, r) => r.weight - l.weight || l.label.localeCompare(r.label));

const sortEdges = (edges: GraphEdgeViewModel[]): GraphEdgeViewModel[] =>
  [...edges].sort((l, r) => l.id.localeCompare(r.id));

export const buildGraphFromFileMetas = (metas: readonly FileMeta[]): GraphBuildResult => {
  const nodeIds = new Set(metas.map((m) => m.id));
  const { edgesById, weights } = buildEdgesAndWeights(metas, nodeIds);

  const adjacency = createAdjacency(Array.from(nodeIds));
  Array.from(edgesById.values()).forEach(({ source, target }) => {
    appendNeighbor(adjacency, source, target);
    appendNeighbor(adjacency, target, source);
  });

  const nodes = sortNodes(
    metas.map((meta) => createNode(meta, weights.get(meta.id) ?? MIN_NODE_WEIGHT)),
  );
  const edges = sortEdges(Array.from(edgesById.values()));

  return { graph: { nodes, edges }, adjacency };
};
