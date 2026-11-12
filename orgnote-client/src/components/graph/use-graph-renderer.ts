import ForceGraph, { type LinkObject, type NodeObject } from 'force-graph';
import type { GraphUiConfig } from 'orgnote-api';
import { isNullable } from 'orgnote-api/utils';
import type { GraphEdgeViewModel, GraphNodeViewModel, GraphViewModel } from 'src/models/graph';
import { getCssVar } from 'src/utils/css-utils';
import { graphConfig } from './graph-config';
import type { GraphColorsComposable } from './use-graph-colors';

type ForceGraphRenderer = ReturnType<ReturnType<typeof ForceGraph>>;
type ForceGraphData = { nodes: GraphNodeViewModel[]; links: LinkObject[] };
type TypedNode = GraphNodeViewModel & NodeObject;

type D3ForceAccessor = (
  name: string,
  force?: unknown,
) =>
  | {
      strength?: (v: number) => unknown;
      distanceMax?: (v: number) => unknown;
    }
  | undefined;

type LabelFadeRange = {
  from: number;
  to: number;
};

type LabelStyle = {
  alpha: number;
  canvasFontSize: number;
};

type LabelRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export interface ResizeContext {
  width: number;
  height: number;
  shouldRender: boolean;
  rootEl?: HTMLElement;
  graphEl?: HTMLElement;
  graph?: GraphViewModel;
}

export interface UseGraphRendererOptions {
  colors: GraphColorsComposable;
  getConfig: () => GraphUiConfig;
  getDimUnrelated: () => boolean;
  getHighlightedSet: () => Set<string>;
  getSelectedNodeId: () => string | undefined;
  getMaxZoom: () => number | undefined;
  onInitialFitDone?: () => void;
  onNodeClick: (node: GraphNodeViewModel) => void;
  onNodeHover: (nodeId?: string) => void;
  onBackgroundClick: () => void;
}

const LABEL_MIN_ALPHA = 0.02;
const LABEL_FADE_SPAN = 0.48;
const LABEL_PRIORITY_FADE_SPAN = 0.32;
const LABEL_NORMAL_MIN_ZOOM = 1.15;
const LABEL_PRIORITY_MIN_ZOOM = 0.55;
const LABEL_ZOOM_GROWTH_BASE = 1.35;
const LABEL_ZOOM_GROWTH_POWER = 0.28;
const LABEL_MAX_ZOOM_GROWTH = 4;
const LABEL_SCREEN_GROWTH_MIN = 0.92;
const LABEL_SCREEN_GROWTH_RANGE = 0.26;
const LABEL_MAX_SCREEN_SCALE = 1.55;
const LABEL_COLLISION_PADDING_X = 6;
const LABEL_COLLISION_PADDING_Y = 3;

const truncateLabel = (value: string): string =>
  value.length <= graphConfig.labelMaxLength
    ? value
    : `${value.slice(0, graphConfig.labelMaxLength - 1)}…`;

export const resolveNodeId = (
  value: NodeObject | string | number | null | undefined,
): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value?.id === undefined || isNullable(value.id)) return undefined;
  return String(value.id);
};

const reuseOrCreateNode = (
  node: GraphNodeViewModel,
  existingById: Map<string, TypedNode>,
  added: TypedNode[],
): TypedNode => {
  const prev = existingById.get(node.id);
  if (prev) return Object.assign(prev, node);
  const created = { ...node } as TypedNode;
  added.push(created);
  return created;
};

export const reconcileGraphNodes = (
  current: TypedNode[],
  next: GraphNodeViewModel[],
): { nodes: TypedNode[]; added: TypedNode[] } => {
  const existingById = new Map(current.map((n) => [resolveNodeId(n) ?? '', n] as const));
  const added: TypedNode[] = [];
  const nodes = next.map((n) => reuseOrCreateNode(n, existingById, added));
  return { nodes, added };
};

const findExistingNeighbor = (
  nodeId: string,
  byId: Map<string, TypedNode>,
  edges: GraphEdgeViewModel[],
  addedIds: Set<string>,
): TypedNode | undefined => {
  const edge = edges.find(
    (e) =>
      (e.source === nodeId && !addedIds.has(e.target)) ||
      (e.target === nodeId && !addedIds.has(e.source)),
  );
  if (!edge) return undefined;
  const neighborId = edge.source === nodeId ? edge.target : edge.source;
  return byId.get(neighborId);
};

const jitter = (): number => (Math.random() - 0.5) * graphConfig.newNodeJitter;

const seedAddedPositions = (
  added: TypedNode[],
  nodes: TypedNode[],
  edges: GraphEdgeViewModel[],
): void => {
  if (!added.length) return;
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const addedIds = new Set(added.map((n) => n.id));
  added.forEach((node) => {
    const anchor = findExistingNeighbor(node.id, byId, edges, addedIds);
    if (!anchor) return;
    node.x = (anchor.x ?? 0) + jitter();
    node.y = (anchor.y ?? 0) + jitter();
  });
};

const ZOOM_FIT_FLOOR = 0.15;
const ZOOM_FIT_SCALE = 4;

const estimateInitialZoom = (nodeCount: number): number =>
  nodeCount > 0 ? Math.max(ZOOM_FIT_FLOOR, ZOOM_FIT_SCALE / Math.sqrt(nodeCount)) : ZOOM_FIT_FLOOR;

const getInitialZoom = (cfg: GraphUiConfig, nodeCount: number): number =>
  Math.min(cfg.initialZoom, estimateInitialZoom(nodeCount));

const getRendererSize = (rootEl?: HTMLElement, graphEl?: HTMLElement) => ({
  width: graphEl?.clientWidth ?? rootEl?.clientWidth ?? graphConfig.defaultWidth,
  height: graphEl?.clientHeight ?? rootEl?.clientHeight ?? graphConfig.defaultHeight,
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getSafeScale = (globalScale: number): number =>
  Math.max(globalScale, graphConfig.minCanvasScale);

const getProgress = (value: number, from: number, to: number): number =>
  clamp((value - from) / (to - from), 0, 1);

const easeOut = (value: number): number => 1 - Math.pow(1 - value, 3);

const getLabelFadeRange = (isPriorityLabel: boolean): LabelFadeRange => {
  const baseVisibleZoom = graphConfig.minLabelVisibleZoom;

  if (isPriorityLabel) {
    const from = Math.max(LABEL_PRIORITY_MIN_ZOOM, baseVisibleZoom * 0.6);

    return {
      from,
      to: from + LABEL_PRIORITY_FADE_SPAN,
    };
  }

  const from = Math.max(LABEL_NORMAL_MIN_ZOOM, baseVisibleZoom * 1.25);

  return {
    from,
    to: from + LABEL_FADE_SPAN,
  };
};

const getLabelFadeProgress = (globalScale: number, isPriorityLabel: boolean): number => {
  const range = getLabelFadeRange(isPriorityLabel);

  return easeOut(getProgress(globalScale, range.from, range.to));
};

const getBaseLabelScreenFontSize = (cfg: GraphUiConfig): number => {
  const baseFontSize = cfg.labelFontSize * graphConfig.labelScreenScale;

  return Math.max(graphConfig.minLabelFontSize, baseFontSize);
};

const getLabelScreenFontSize = (
  cfg: GraphUiConfig,
  globalScale: number,
  fadeProgress: number,
): number => {
  const baseFontSize = getBaseLabelScreenFontSize(cfg);
  const zoom = clamp(globalScale, 1, LABEL_MAX_ZOOM_GROWTH);
  const zoomGrowth = Math.pow(zoom / LABEL_ZOOM_GROWTH_BASE, LABEL_ZOOM_GROWTH_POWER);
  const fadeGrowth = LABEL_SCREEN_GROWTH_MIN + fadeProgress * LABEL_SCREEN_GROWTH_RANGE;

  return clamp(
    baseFontSize * zoomGrowth * fadeGrowth,
    baseFontSize * LABEL_SCREEN_GROWTH_MIN,
    baseFontSize * LABEL_MAX_SCREEN_SCALE,
  );
};

const getLabelStyle = (
  cfg: GraphUiConfig,
  globalScale: number,
  isPriorityLabel: boolean,
): LabelStyle | undefined => {
  const fadeProgress = getLabelFadeProgress(globalScale, isPriorityLabel);

  if (fadeProgress <= LABEL_MIN_ALPHA) return undefined;

  const screenFontSize = getLabelScreenFontSize(cfg, globalScale, fadeProgress);

  return {
    alpha: fadeProgress,
    canvasFontSize: screenFontSize / getSafeScale(globalScale),
  };
};

const createLabelRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  globalScale: number,
): LabelRect => {
  const paddingX = LABEL_COLLISION_PADDING_X / getSafeScale(globalScale);
  const paddingY = LABEL_COLLISION_PADDING_Y / getSafeScale(globalScale);
  const textWidth = ctx.measureText(text).width;

  return {
    left: x - textWidth / 2 - paddingX,
    right: x + textWidth / 2 + paddingX,
    top: y - paddingY,
    bottom: y + fontSize + paddingY,
  };
};

const intersects = (first: LabelRect, second: LabelRect): boolean =>
  first.left <= second.right &&
  first.right >= second.left &&
  first.top <= second.bottom &&
  first.bottom >= second.top;

const hasCollision = (rect: LabelRect, rects: readonly LabelRect[]): boolean =>
  rects.some((existingRect) => intersects(rect, existingRect));

const clampZoomToMax = (
  renderer: ForceGraphRenderer,
  maxZoom: number | undefined,
  duration: number,
): void => {
  if (maxZoom === undefined) return;
  if (renderer.zoom() <= maxZoom) return;
  renderer.zoom(maxZoom, duration);
};

export const useGraphRenderer = (opts: UseGraphRendererOptions) => {
  const {
    colors,
    getConfig,
    getDimUnrelated,
    getHighlightedSet,
    getSelectedNodeId,
    getMaxZoom,
    onInitialFitDone,
    onNodeClick,
    onNodeHover,
    onBackgroundClick,
  } = opts;

  let renderer: ForceGraphRenderer | undefined;
  let currentNodes: TypedNode[] = [];
  let labelRects: LabelRect[] = [];
  let resizeFrameId = 0;
  let hoveredNodeId: string | undefined;
  let hoverLeaveTimerId = 0;
  let zoomToFitTimerId = 0;
  let shouldFitOnEngineStop = false;
  let hasCompletedInitialFit = false;

  const resetLabelRects = (): void => {
    labelRects = [];
  };

  const clearHoverLeaveTimer = (): void => {
    window.clearTimeout(hoverLeaveTimerId);
    hoverLeaveTimerId = 0;
  };

  const updateHoveredNode = (nodeId: string | undefined): void => {
    if (hoveredNodeId === nodeId) return;
    hoveredNodeId = nodeId;
    onNodeHover(nodeId);
  };

  const scheduleHoverClear = (): void => {
    if (hoveredNodeId === undefined) return;
    clearHoverLeaveTimer();
    hoverLeaveTimerId = window.setTimeout(() => {
      hoverLeaveTimerId = 0;
      updateHoveredNode(undefined);
    }, graphConfig.hoverLeaveDelay);
  };

  const handleNodeHover = (node: NodeObject | string | number | null | undefined): void => {
    const nodeId = resolveNodeId(node);
    if (nodeId === undefined) {
      scheduleHoverClear();
      return;
    }

    clearHoverLeaveTimer();
    updateHoveredNode(nodeId);
  };

  const paintPointerArea = (
    node: NodeObject,
    color: string,
    ctx: CanvasRenderingContext2D,
  ): void => {
    const r = getConfig().nodeRelSize + graphConfig.pointerPadding;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
    ctx.fill();
  };

  const applyForces = (r: ForceGraphRenderer): void => {
    const cfg = getConfig();
    const linkForce = r.d3Force('link') as { distance?: (fn: () => number) => void } | undefined;
    linkForce?.distance?.(() => cfg.linkDistance);
    const d3Force = r.d3Force as unknown as D3ForceAccessor;
    const chargeForce = d3Force('charge');
    chargeForce?.strength?.(cfg.chargeStrength);
    chargeForce?.distanceMax?.(graphConfig.chargeDistanceMax);
    d3Force('center')?.strength?.(graphConfig.centerForceStrength);
  };

  const getNodeColor = (node: NodeObject): string => {
    const nodeId = resolveNodeId(node);
    const set = getHighlightedSet();
    const isActive = (nodeId ? set.has(nodeId) : false) || getSelectedNodeId() === nodeId;
    const hasDim = getDimUnrelated() && set.size > 0;
    return colors.nodeColorFor(isActive, hasDim);
  };

  const getEdgeColor = (link: LinkObject): string => {
    const set = getHighlightedSet();
    const sourceId = resolveNodeId(link.source);
    const targetId = resolveNodeId(link.target);
    const isHighlighted =
      sourceId !== undefined && targetId !== undefined && set.has(sourceId) && set.has(targetId);
    const hasDim = getDimUnrelated() && set.size > 0;
    return colors.edgeColorFor(isHighlighted, hasDim);
  };

  const isPriorityLabel = (nodeId: string | undefined): boolean =>
    nodeId !== undefined &&
    (nodeId === hoveredNodeId || nodeId === getSelectedNodeId() || getHighlightedSet().has(nodeId));

  const shouldSkipLabelByCollision = (rect: LabelRect, isPriority: boolean): boolean =>
    !isPriority && hasCollision(rect, labelRects);

  const drawNodeLabel = (
    node: NodeObject,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ): void => {
    const graphNode = node as TypedNode;
    const nodeId = resolveNodeId(graphNode);
    const isPriority = isPriorityLabel(nodeId);
    const cfg = getConfig();
    const style = getLabelStyle(cfg, globalScale, isPriority);

    if (!style) return;

    const label = truncateLabel(graphNode.label);
    const x = graphNode.x ?? 0;
    const y = (graphNode.y ?? 0) + cfg.nodeRelSize + graphConfig.labelOffset;
    const fontFamily = getCssVar('--graph-label-font') ?? 'sans-serif';

    ctx.save();
    ctx.font = `${graphConfig.labelFontWeight} ${style.canvasFontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const rect = createLabelRect(ctx, x, y, label, style.canvasFontSize, globalScale);

    if (shouldSkipLabelByCollision(rect, isPriority)) {
      ctx.restore();
      return;
    }

    labelRects.push(rect);
    ctx.globalAlpha = style.alpha;
    ctx.fillStyle = getCssVar('--graph-label-color') ?? '#d0d0d0';
    ctx.fillText(label, x, y);
    ctx.restore();
  };

  const setSize = (
    rootEl?: HTMLElement,
    graphEl?: HTMLElement,
    size?: { width: number; height: number },
  ): void => {
    if (!renderer) return;
    const s = size ?? getRendererSize(rootEl, graphEl);
    if (s.width <= 0 || s.height <= 0) return;
    renderer.width(s.width).height(s.height);
  };

  const syncColors = (): void => {
    renderer?.nodeColor(getNodeColor).linkColor(getEdgeColor);
  };

  const applyRendererConfig = (r: ForceGraphRenderer): void => {
    const cfg = getConfig();
    r.nodeRelSize(cfg.nodeRelSize)
      .linkWidth(cfg.linkWidth)
      .d3VelocityDecay(cfg.velocityDecay)
      .warmupTicks(cfg.warmupTicks)
      .maxZoom(getMaxZoom() ?? Infinity);
    applyForces(r);
  };

  const scheduleFitToView = (): void => {
    shouldFitOnEngineStop = true;
    zoomToFitTimerId = window.setTimeout(() => {
      zoomToFitTimerId = 0;
      if (!shouldFitOnEngineStop) return;
      shouldFitOnEngineStop = false;
      runFitToView();
    }, graphConfig.zoomToFitDelay);
  };

  const syncConfig = (): void => {
    if (!renderer) return;
    window.clearTimeout(zoomToFitTimerId);
    applyRendererConfig(renderer);
    renderer.d3ReheatSimulation();
  };

  const syncConfigAndFit = (): void => {
    if (!renderer) return;
    syncConfig();
    scheduleFitToView();
  };

  const applyZoomToFit = (duration: number): void => {
    if (!renderer) return;
    renderer.zoomToFit(duration, graphConfig.zoomToFitPadding);
    clampZoomToMax(renderer, getMaxZoom(), duration);
  };

  const finalizeInitialFit = (): void => {
    if (hasCompletedInitialFit) return;
    hasCompletedInitialFit = true;
    onInitialFitDone?.();
  };

  const runFitToView = (): void => {
    const duration = hasCompletedInitialFit ? graphConfig.zoomToFitDuration : 0;
    applyZoomToFit(duration);
    finalizeInitialFit();
  };

  const syncData = (graph: GraphViewModel, fitToView = false): void => {
    if (!renderer) return;
    window.clearTimeout(zoomToFitTimerId);
    const { nodes, added } = reconcileGraphNodes(currentNodes, graph.nodes);
    seedAddedPositions(added, nodes, graph.edges);
    currentNodes = nodes;
    renderer.graphData({
      nodes,
      links: graph.edges.map((e) => ({ ...e })),
    } as ForceGraphData);
    applyForces(renderer);
    if (added.length) renderer.d3ReheatSimulation();
    if (!fitToView) return;

    scheduleFitToView();
  };

  const create = (el: HTMLElement, nodeCount: number): void => {
    if (renderer) return;
    const cfg = getConfig();
    renderer = ForceGraph()(el)
      .nodeRelSize(cfg.nodeRelSize)
      .zoom(getInitialZoom(cfg, nodeCount))
      .maxZoom(getMaxZoom() ?? Infinity)
      .nodeLabel('')
      .linkColor(getEdgeColor)
      .linkWidth(cfg.linkWidth)
      .nodeId('id')
      .onNodeClick((node) => onNodeClick(node as GraphNodeViewModel))
      .onNodeHover(handleNodeHover)
      .onBackgroundClick(onBackgroundClick)
      .onEngineStop(() => {
        if (!shouldFitOnEngineStop) return;
        shouldFitOnEngineStop = false;
        window.clearTimeout(zoomToFitTimerId);
        zoomToFitTimerId = 0;
        runFitToView();
      })
      .onRenderFramePre(resetLabelRects)
      .nodeCanvasObjectMode(() => 'before')
      .nodePointerAreaPaint(paintPointerArea)
      .linkDirectionalParticleWidth(graphConfig.particleWidth)
      .nodeColor(getNodeColor)
      .autoPauseRedraw(false)
      .nodeCanvasObject(drawNodeLabel)
      .d3VelocityDecay(cfg.velocityDecay)
      .warmupTicks(cfg.warmupTicks);
  };

  const destroy = (graphEl?: HTMLElement): void => {
    window.cancelAnimationFrame(resizeFrameId);
    resizeFrameId = 0;
    currentNodes = [];
    labelRects = [];
    hoveredNodeId = undefined;
    clearHoverLeaveTimer();
    window.clearTimeout(zoomToFitTimerId);
    zoomToFitTimerId = 0;
    shouldFitOnEngineStop = false;
    hasCompletedInitialFit = false;
    (renderer as ForceGraphRenderer & { _destructor?: () => void })?._destructor?.();
    renderer?.pauseAnimation();
    renderer = undefined;
    graphEl?.replaceChildren();
  };

  const queueResize = (ctx: ResizeContext): void => {
    window.cancelAnimationFrame(resizeFrameId);
    resizeFrameId = window.requestAnimationFrame(() => {
      resizeFrameId = 0;
      if (!ctx.shouldRender) return;
      if (!renderer && ctx.graphEl && ctx.graph) {
        create(ctx.graphEl, ctx.graph?.nodes.length ?? 0);
        syncColors();
        syncData(ctx.graph);
        setSize(ctx.rootEl, ctx.graphEl);
        return;
      }
      setSize(ctx.rootEl, ctx.graphEl, {
        width: ctx.width,
        height: ctx.height,
      });
    });
  };

  const isActive = (): boolean => Boolean(renderer);

  return {
    create,
    destroy,
    syncColors,
    syncConfig,
    syncConfigAndFit,
    syncData,
    setSize,
    queueResize,
    isActive,
  };
};
