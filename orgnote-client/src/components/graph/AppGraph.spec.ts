import { mount } from '@vue/test-utils';
import type { GraphUiConfig } from 'orgnote-api';
import { beforeEach, expect, test, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

import type { GraphViewModel } from 'src/models/graph';
import AppGraph from './AppGraph.vue';

interface AppGraphProps {
  graph: GraphViewModel;
  selectedNodeId?: string;
  highlightedNodeIds?: string[];
  graphConfig: GraphUiConfig;
  dimUnrelated?: boolean;
  maxZoom?: number;
  fitOnGraphChange?: boolean;
}

type RendererGraphPayload = {
  nodes: GraphViewModel['nodes'];
  links: GraphViewModel['edges'];
};

interface RendererMock {
  nodeRelSize: ReturnType<typeof vi.fn>;
  nodeVal: ReturnType<typeof vi.fn>;
  zoom: ReturnType<typeof vi.fn>;
  maxZoom: ReturnType<typeof vi.fn>;
  nodeLabel: ReturnType<typeof vi.fn>;
  linkVisibility: ReturnType<typeof vi.fn>;
  linkColor: ReturnType<typeof vi.fn>;
  linkWidth: ReturnType<typeof vi.fn>;
  nodePointerAreaPaint: ReturnType<typeof vi.fn>;
  nodeId: ReturnType<typeof vi.fn>;
  onNodeClick: ReturnType<typeof vi.fn>;
  onNodeHover: ReturnType<typeof vi.fn>;
  onBackgroundClick: ReturnType<typeof vi.fn>;
  onEngineStop: ReturnType<typeof vi.fn>;
  onRenderFramePre: ReturnType<typeof vi.fn>;
  nodeCanvasObjectMode: ReturnType<typeof vi.fn>;
  linkDirectionalParticleWidth: ReturnType<typeof vi.fn>;
  nodeColor: ReturnType<typeof vi.fn>;
  autoPauseRedraw: ReturnType<typeof vi.fn>;
  nodeCanvasObject: ReturnType<typeof vi.fn>;
  d3VelocityDecay: ReturnType<typeof vi.fn>;
  warmupTicks: ReturnType<typeof vi.fn>;
  graphData: ReturnType<typeof vi.fn<(graphData: RendererGraphPayload) => RendererMock>>;
  d3Force: ReturnType<typeof vi.fn>;
  width: ReturnType<typeof vi.fn>;
  height: ReturnType<typeof vi.fn>;
  d3ReheatSimulation: ReturnType<typeof vi.fn>;
  zoomToFit: ReturnType<typeof vi.fn>;
  pauseAnimation: ReturnType<typeof vi.fn>;
  _destructor: ReturnType<typeof vi.fn>;
}

const renderer = {} as RendererMock;
const returnRenderer = () => renderer;
const distance = vi.fn();
const distanceMax = vi.fn();
const strength = vi.fn();
const resizeObserverObserve = vi.fn();
const resizeObserverDisconnect = vi.fn();

const callbacks = {
  nodeClick: undefined as ((node: unknown) => void) | undefined,
  nodeHover: undefined as ((node?: unknown) => void) | undefined,
  backgroundClick: undefined as (() => void) | undefined,
};

Object.assign(renderer, {
  nodeRelSize: vi.fn(returnRenderer),
  nodeVal: vi.fn(returnRenderer),
  zoom: vi.fn(returnRenderer),
  maxZoom: vi.fn(returnRenderer),
  nodeLabel: vi.fn(returnRenderer),
  linkVisibility: vi.fn(returnRenderer),
  linkColor: vi.fn(returnRenderer),
  linkWidth: vi.fn(returnRenderer),
  nodePointerAreaPaint: vi.fn(returnRenderer),
  nodeId: vi.fn(returnRenderer),
  onNodeClick: vi.fn((handler) => {
    callbacks.nodeClick = handler;
    return renderer;
  }),
  onNodeHover: vi.fn((handler) => {
    callbacks.nodeHover = handler;
    return renderer;
  }),
  onBackgroundClick: vi.fn((handler) => {
    callbacks.backgroundClick = handler;
    return renderer;
  }),
  onEngineStop: vi.fn(returnRenderer),
  onRenderFramePre: vi.fn(returnRenderer),
  nodeCanvasObjectMode: vi.fn(returnRenderer),
  linkDirectionalParticleWidth: vi.fn(returnRenderer),
  nodeColor: vi.fn(returnRenderer),
  autoPauseRedraw: vi.fn(returnRenderer),
  nodeCanvasObject: vi.fn(returnRenderer),
  d3VelocityDecay: vi.fn(returnRenderer),
  warmupTicks: vi.fn(returnRenderer),
  graphData: vi.fn<(graphData: RendererGraphPayload) => typeof renderer>(returnRenderer),
  d3Force: vi.fn(() => ({ distance, distanceMax, strength })),
  width: vi.fn(returnRenderer),
  height: vi.fn(returnRenderer),
  d3ReheatSimulation: vi.fn(returnRenderer),
  zoomToFit: vi.fn(returnRenderer),
  pauseAnimation: vi.fn(returnRenderer),
  _destructor: vi.fn(),
});

vi.mock('force-graph', () => ({ default: () => () => renderer }));
vi.mock('d3-force-3d', () => ({
  forceCollide: () => ({ strength: () => ({}) }),
}));

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: class ResizeObserver {
    observe = resizeObserverObserve;
    disconnect = resizeObserverDisconnect;
  },
});

Object.defineProperty(globalThis, 'MutationObserver', {
  configurable: true,
  writable: true,
  value: class MutationObserver {
    observe = vi.fn();
    disconnect = vi.fn();
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  renderer.zoom.mockImplementation(returnRenderer);
  callbacks.nodeClick = undefined;
  callbacks.nodeHover = undefined;
  callbacks.backgroundClick = undefined;
});

const flushGraphRender = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const graph: GraphViewModel = {
  nodes: [
    { id: 'alpha', label: 'Alpha', weight: 3, path: '/notes/alpha.org' },
    { id: 'beta', label: 'Beta', weight: 2, path: '/notes/beta.org' },
  ],
  edges: [{ id: 'alpha::beta', source: 'alpha', target: 'beta' }],
};

const defaultGraphConfig = {
  nodeRelSize: 4,
  linkDistance: 50,
  chargeStrength: -80,
  warmupTicks: 150,
  velocityDecay: 0.3,
  initialZoom: 1.5,
  labelFontSize: 12,
  linkWidth: 0.5,
};

const createProps = (overrides: Partial<AppGraphProps> = {}): AppGraphProps => ({
  graph,
  graphConfig: defaultGraphConfig,
  ...overrides,
});

test('AppGraph passes graph data to force renderer', async () => {
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  expect(wrapper.find('[data-test="graph-canvas"]').exists()).toBe(true);
  const firstGraphCall = renderer.graphData.mock.calls.at(0);
  if (!firstGraphCall) {
    throw new Error('Expected graphData to be called');
  }

  const graphPayload = firstGraphCall[0];

  expect(graphPayload.links).toEqual([{ id: 'alpha::beta', source: 'alpha', target: 'beta' }]);
  expect(graphPayload.nodes).toEqual(graph.nodes);
  expect(graphPayload.nodes).not.toBe(graph.nodes);
  expect(graphPayload.links).not.toBe(graph.edges);
  expect(renderer.d3Force).toHaveBeenCalledWith('link');
  expect(renderer.d3Force).toHaveBeenCalledWith('charge');
  expect(distance).toHaveBeenCalledTimes(1);
  expect(distanceMax).toHaveBeenCalledWith(240);
});

type LabelDrawHandler = (node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => void;

type CanvasContextStub = CanvasRenderingContext2D & {
  font: string;
  fillText: ReturnType<typeof vi.fn>;
  measureText: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

const createCanvasContextStub = (): CanvasContextStub =>
  ({
    font: '',
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
    fillStyle: '',
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 6 })),
    restore: vi.fn(),
    save: vi.fn(),
  }) as unknown as CanvasContextStub;

const getLabelDrawHandler = (): LabelDrawHandler => {
  const handler = renderer.nodeCanvasObject.mock.calls.at(0)?.[0];
  if (!handler) throw new Error('Expected label draw handler');
  return handler as LabelDrawHandler;
};

test('AppGraph keeps label canvas size bounded while zooming', async () => {
  mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  const ctx = createCanvasContextStub();
  getLabelDrawHandler()(graph.nodes[0], ctx, 4);

  expect(ctx.font).toContain('400 3.813px');
  expect(ctx.fillText).toHaveBeenCalledWith('Alpha', 0, 12);
});

test('AppGraph draws unfocused labels at readable overview zoom', async () => {
  mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  const ctx = createCanvasContextStub();
  getLabelDrawHandler()(graph.nodes[0], ctx, 1.4);

  expect(ctx.fillText).toHaveBeenCalledWith('Alpha', 0, 12);
});

test('AppGraph hides unfocused labels below readable overview zoom', async () => {
  mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  const ctx = createCanvasContextStub();
  getLabelDrawHandler()(graph.nodes[0], ctx, 0.6);

  expect(ctx.fillText).not.toHaveBeenCalled();
});

test('AppGraph keeps visible label size unchanged on hover', async () => {
  mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  const drawLabel = getLabelDrawHandler();
  const unfocusedCtx = createCanvasContextStub();
  drawLabel(graph.nodes[0], unfocusedCtx, 1.7);

  callbacks.nodeHover?.('alpha');
  const focusedCtx = createCanvasContextStub();
  drawLabel(graph.nodes[0], focusedCtx, 1.7);

  expect(focusedCtx.font).toBe(unfocusedCtx.font);
  expect(focusedCtx.fillText).toHaveBeenCalledWith('Alpha', 0, 12);
});

test('AppGraph shows hidden label on hover with priority fade', async () => {
  mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  const drawLabel = getLabelDrawHandler();
  const unfocusedCtx = createCanvasContextStub();
  drawLabel(graph.nodes[0], unfocusedCtx, 0.6);

  callbacks.nodeHover?.('alpha');
  const focusedCtx = createCanvasContextStub();
  drawLabel(graph.nodes[0], focusedCtx, 0.6);

  expect(unfocusedCtx.fillText).not.toHaveBeenCalled();
  expect(focusedCtx.font).toMatch(/^400 15\.4\d*px /);
  expect(focusedCtx.fillText).toHaveBeenCalledWith('Alpha', 0, 12);
});

test('AppGraph emits nodeClick when node is clicked', async () => {
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  callbacks.nodeClick?.(graph.nodes[0]);

  expect(wrapper.emitted('nodeClick')?.[0]?.[0]).toMatchObject({ id: 'alpha' });
});

test('AppGraph emits backgroundClick when renderer background is clicked', async () => {
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  callbacks.backgroundClick?.();

  expect(wrapper.emitted('backgroundClick')).toHaveLength(1);
});

test('AppGraph emits nodeHover when renderer hover changes', async () => {
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  callbacks.nodeHover?.('alpha');

  expect(wrapper.emitted('nodeHover')?.[0]).toEqual(['alpha']);
});

test('AppGraph does not emit nodeHover for the same node twice', async () => {
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  callbacks.nodeHover?.('alpha');
  callbacks.nodeHover?.('alpha');

  expect(wrapper.emitted('nodeHover')).toHaveLength(1);
});

test('AppGraph emits undefined nodeHover after hover leaves', async () => {
  vi.useFakeTimers();
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  callbacks.nodeHover?.('alpha');
  callbacks.nodeHover?.(undefined);
  vi.advanceTimersByTime(60);

  expect(wrapper.emitted('nodeHover')?.at(-1)).toEqual([undefined]);
  vi.useRealTimers();
});

test('AppGraph keeps hover stable during transient pointer misses', async () => {
  vi.useFakeTimers();
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  callbacks.nodeHover?.('alpha');
  callbacks.nodeHover?.(undefined);
  callbacks.nodeHover?.('alpha');
  vi.advanceTimersByTime(60);

  expect(wrapper.emitted('nodeHover')).toHaveLength(1);
  vi.useRealTimers();
});

test('AppGraph renders empty state when graph has no nodes', () => {
  const wrapper = mount(AppGraph, {
    props: createProps({ graph: { nodes: [], edges: [] } }),
  });

  expect(wrapper.text()).toContain('graph.empty.title');
});

test('AppGraph does not reset graph data when only highlighted nodes change', async () => {
  const highlightedNodeIds = ref<string[]>([]);

  const TestHarness = defineComponent({
    components: { AppGraph },
    setup() {
      return { graph, highlightedNodeIds, defaultGraphConfig };
    },
    template:
      '<AppGraph :graph="graph" :graph-config="defaultGraphConfig" :highlighted-node-ids="highlightedNodeIds" />',
  });

  mount(TestHarness);

  await flushGraphRender();
  vi.clearAllMocks();

  highlightedNodeIds.value = ['alpha', 'beta'];
  await nextTick();
  await flushGraphRender();

  expect(renderer.graphData).not.toHaveBeenCalled();
  expect(renderer.d3ReheatSimulation).not.toHaveBeenCalled();
  expect(renderer.nodeColor).toHaveBeenCalled();
  expect(renderer.linkColor).toHaveBeenCalled();
});

test('AppGraph destroys force renderer on unmount', async () => {
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();
  wrapper.unmount();

  expect(renderer._destructor).toHaveBeenCalledTimes(1);
  expect(resizeObserverDisconnect).toHaveBeenCalled();
});

test('AppGraph sets zoom to floor value when graph has zero nodes', async () => {
  mount(AppGraph, {
    props: createProps({ graph: { nodes: [], edges: [] } }),
  });

  await flushGraphRender();

  expect(renderer.zoom).not.toHaveBeenCalledWith(Infinity);
});

test('AppGraph caps dynamic initial zoom with configured initialZoom', async () => {
  mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();

  expect(renderer.zoom.mock.calls.at(0)?.[0]).toBe(1.5);
});

test('AppGraph computes dynamic initial zoom for dense graphs', async () => {
  const denseGraph: GraphViewModel = {
    nodes: Array.from({ length: 100 }, (_, index) => ({
      id: `node-${index}`,
      label: `Node ${index}`,
      weight: 1,
      path: `/notes/node-${index}.org`,
    })),
    edges: [],
  };

  mount(AppGraph, {
    props: createProps({ graph: denseGraph }),
  });

  await flushGraphRender();

  expect(renderer.zoom.mock.calls.at(0)?.[0]).toBe(0.4);
});

test('AppGraph reapplies graphConfig without recreating graph data', async () => {
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();
  vi.clearAllMocks();

  const setGraphProps = wrapper.setProps.bind(wrapper) as (
    props: Partial<AppGraphProps>,
  ) => Promise<void>;
  await setGraphProps({
    graphConfig: {
      ...defaultGraphConfig,
      nodeRelSize: 8,
      linkWidth: 0.75,
      velocityDecay: 0.45,
      warmupTicks: 220,
    },
  });
  await flushGraphRender();

  expect(renderer.nodeRelSize).toHaveBeenCalledWith(8);
  expect(renderer.linkWidth).toHaveBeenCalledWith(0.75);
  expect(renderer.d3VelocityDecay).toHaveBeenCalledWith(0.45);
  expect(renderer.warmupTicks).toHaveBeenCalledWith(220);
  expect(renderer.graphData).not.toHaveBeenCalled();
  expect(renderer.d3ReheatSimulation).toHaveBeenCalled();
});

test('AppGraph applies maxZoom when provided', async () => {
  mount(AppGraph, {
    props: createProps({ maxZoom: 1.35 }),
  });

  await flushGraphRender();

  expect(renderer.maxZoom).toHaveBeenCalledWith(1.35);
});

test('AppGraph keeps canvas hidden until initial fit completes', async () => {
  vi.useFakeTimers();
  const wrapper = mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();
  expect(wrapper.get('[data-test="graph-canvas"]').classes()).not.toContain('ready');

  vi.advanceTimersByTime(2000);
  await flushGraphRender();
  expect(wrapper.get('[data-test="graph-canvas"]').classes()).toContain('ready');
  vi.useRealTimers();
});

test('AppGraph fits graph after graph changes when enabled', async () => {
  vi.useFakeTimers();
  const wrapper = mount(AppGraph, {
    props: createProps({ fitOnGraphChange: true }),
  });

  await flushGraphRender();
  vi.clearAllMocks();

  const singleNodeGraph: GraphViewModel = {
    nodes: [{ id: 'single', label: 'Single', weight: 1, path: '/notes/single.org' }],
    edges: [],
  };

  const setGraphProps = wrapper.setProps.bind(wrapper) as (
    props: Partial<AppGraphProps>,
  ) => Promise<void>;
  await setGraphProps({ graph: singleNodeGraph });
  await flushGraphRender();
  vi.advanceTimersByTime(2000);

  expect(renderer.zoomToFit).toHaveBeenCalled();
  vi.useRealTimers();
});

test('AppGraph does not call zoomToFit when fitToView is not triggered on resize', async () => {
  vi.useFakeTimers();

  mount(AppGraph, {
    props: createProps(),
  });

  await flushGraphRender();
  vi.advanceTimersByTime(2000);
  vi.clearAllMocks();

  const graphEl = document.createElement('div');
  Object.defineProperty(graphEl, 'clientWidth', {
    value: 800,
    configurable: true,
  });
  Object.defineProperty(graphEl, 'clientHeight', {
    value: 600,
    configurable: true,
  });

  resizeObserverObserve.mock.calls.at(0)?.[1]?.([
    { target: graphEl } as unknown,
  ] as ResizeObserverEntry[]);
  vi.advanceTimersByTime(2000);

  expect(renderer.zoomToFit).not.toHaveBeenCalled();

  vi.useRealTimers();
});
