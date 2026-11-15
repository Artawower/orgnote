import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';
import { ref } from 'vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));
import type { FileMeta } from 'orgnote-api';

const getAll = vi.fn<() => Promise<FileMeta[]>>();
const open = vi.fn<() => Promise<void>>();
const activeContext = ref<{ filePath?: string } | null>(null);
const config = ref({ ui: { graph: {} } });

type FsChange = { type: string; path: string; previousPath?: string };
let triggerWatch: ((change: FsChange) => void) | undefined;
const watch = vi.fn((_path: string, listener: (change: FsChange) => void) => {
  triggerWatch = listener;
  return () => {
    triggerWatch = undefined;
  };
});
const orgChange: FsChange = { type: 'delete', path: '/notes/alpha.org' };

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useConfig: () => ({ config }),
      useFileMeta: () => ({ getAll }),
      useEditor: () => ({ activeContext: activeContext.value }),
      useBufferViewer: () => ({ open }),
      useFileWatcher: () => ({ watch }),
    },
  },
}));

import GraphContainer from './GraphContainer.vue';

beforeEach(() => {
  vi.clearAllMocks();
  triggerWatch = undefined;
  activeContext.value = null;
  getAll.mockResolvedValue([
    {
      id: 'alpha',
      filePath: ['notes', 'alpha.org'],
      title: 'Alpha',
      links: ['beta'],
    },
    {
      id: 'beta',
      filePath: ['notes', 'beta.org'],
      title: 'Beta',
    },
  ]);
});

test('GraphContainer loads graph metadata on mount', async () => {
  const wrapper = mount(GraphContainer, {
    global: {
      stubs: {
        AppGraph: {
          name: 'AppGraph',
          props: ['graph', 'selectedNodeId', 'highlightedNodeIds', 'loading', 'error'],
          template: '<div class="graph-stub" />',
        },
      },
    },
  });

  await flushPromises();

  const graph = wrapper.getComponent({ name: 'AppGraph' }).props('graph') as {
    nodes: Array<{ id: string }>;
    edges: Array<{ id: string }>;
  };

  expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['alpha', 'beta']));
  expect(graph.edges).toEqual([{ id: 'alpha::beta', source: 'alpha', target: 'beta' }]);
});

test('GraphContainer limits zoom for a single-node graph', async () => {
  getAll.mockResolvedValue([
    {
      id: 'alpha',
      filePath: ['notes', 'alpha.org'],
      title: 'Alpha',
    },
  ]);

  const wrapper = mount(GraphContainer, {
    global: {
      stubs: {
        AppGraph: {
          name: 'AppGraph',
          props: ['graph', 'selectedNodeId', 'highlightedNodeIds', 'maxZoom'],
          template: '<div class="graph-stub" />',
        },
      },
    },
  });

  await flushPromises();

  expect(wrapper.getComponent({ name: 'AppGraph' }).props('maxZoom')).toBe(1.2);
});

test('GraphContainer highlights active editor note when available', async () => {
  activeContext.value = { filePath: '/notes/beta.org' };

  const wrapper = mount(GraphContainer, {
    global: {
      stubs: {
        AppGraph: {
          name: 'AppGraph',
          props: ['graph', 'selectedNodeId', 'highlightedNodeIds', 'loading', 'error'],
          template: '<div class="graph-stub" />',
        },
      },
    },
  });

  await flushPromises();

  expect(wrapper.getComponent({ name: 'AppGraph' }).props('selectedNodeId')).toBe('beta');
});

test('GraphContainer opens selected note when nodeClick is emitted', async () => {
  const wrapper = mount(GraphContainer, {
    global: {
      stubs: {
        AppGraph: {
          name: 'AppGraph',
          props: ['graph', 'selectedNodeId', 'highlightedNodeIds', 'loading', 'error'],
          template: '<div class="graph-stub" />',
        },
      },
    },
  });

  await flushPromises();

  await wrapper.getComponent({ name: 'AppGraph' }).vm.$emit('nodeClick', {
    id: 'alpha',
    label: 'Alpha',
    weight: 2,
    path: '/notes/alpha.org',
  });

  expect(open).toHaveBeenCalledWith('file:///notes/alpha.org');
});

test('GraphContainer keeps selected-node highlight when hover is cleared', async () => {
  activeContext.value = { filePath: '/notes/beta.org' };

  const wrapper = mount(GraphContainer, {
    global: {
      stubs: {
        AppGraph: {
          name: 'AppGraph',
          props: ['graph', 'selectedNodeId', 'highlightedNodeIds', 'loading', 'error'],
          template: '<div class="graph-stub" />',
        },
      },
    },
  });

  await flushPromises();

  await wrapper.getComponent({ name: 'AppGraph' }).vm.$emit('nodeHover', 'alpha');
  await flushPromises();

  expect(wrapper.getComponent({ name: 'AppGraph' }).props('highlightedNodeIds')).toEqual([
    'alpha',
    'beta',
  ]);

  await wrapper.getComponent({ name: 'AppGraph' }).vm.$emit('nodeHover', undefined);
  await flushPromises();

  expect(wrapper.getComponent({ name: 'AppGraph' }).props('highlightedNodeIds')).toEqual([
    'beta',
    'alpha',
  ]);
});

test('GraphContainer reactively refreshes when watched files change (#72)', async () => {
  vi.useFakeTimers();
  const wrapper = mount(GraphContainer, {
    global: {
      stubs: {
        AppGraph: {
          name: 'AppGraph',
          props: ['graph', 'selectedNodeId', 'highlightedNodeIds', 'loading', 'error'],
          template: '<div class="graph-stub" />',
        },
      },
    },
  });

  await flushPromises();

  getAll.mockResolvedValue([{ id: 'beta', filePath: ['notes', 'beta.org'], title: 'Beta' }]);
  triggerWatch?.(orgChange);
  await vi.advanceTimersByTimeAsync(300);
  await flushPromises();

  const graph = wrapper.getComponent({ name: 'AppGraph' }).props('graph') as {
    nodes: Array<{ id: string }>;
  };

  expect(graph.nodes.map((node) => node.id)).toEqual(['beta']);
  vi.useRealTimers();
});

test('GraphContainer does not refresh on unrelated non-org file changes', async () => {
  vi.useFakeTimers();
  const wrapper = mount(GraphContainer, {
    global: {
      stubs: {
        AppGraph: {
          name: 'AppGraph',
          props: ['graph', 'selectedNodeId', 'highlightedNodeIds', 'loading', 'error'],
          template: '<div class="graph-stub" />',
        },
      },
    },
  });

  await flushPromises();
  getAll.mockClear();

  triggerWatch?.({ type: 'modify', path: '/assets/img.png' });
  await vi.advanceTimersByTimeAsync(300);
  await flushPromises();

  expect(getAll).not.toHaveBeenCalled();
  expect(
    wrapper
      .getComponent({ name: 'AppGraph' })
      .props('graph')
      .nodes.map((n: { id: string }) => n.id),
  ).toEqual(expect.arrayContaining(['alpha', 'beta']));
  vi.useRealTimers();
});

test('GraphContainer clears a previous error after a successful silent refresh', async () => {
  vi.useFakeTimers();
  getAll.mockRejectedValueOnce(new Error('boom'));

  const wrapper = mount(GraphContainer, {
    global: {
      stubs: {
        AppGraph: {
          name: 'AppGraph',
          props: ['graph', 'selectedNodeId', 'highlightedNodeIds', 'loading', 'error'],
          template: '<div class="graph-stub" />',
        },
      },
    },
  });

  await flushPromises();
  expect(wrapper.findComponent({ name: 'AppGraph' }).exists()).toBe(false);

  getAll.mockResolvedValue([{ id: 'beta', filePath: ['notes', 'beta.org'], title: 'Beta' }]);
  triggerWatch?.(orgChange);
  await vi.advanceTimersByTimeAsync(300);
  await flushPromises();

  expect(wrapper.findComponent({ name: 'AppGraph' }).exists()).toBe(true);
  vi.useRealTimers();
});
