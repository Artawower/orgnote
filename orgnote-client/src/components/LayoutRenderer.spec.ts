import { shallowMount } from '@vue/test-utils';
import { test, expect, vi } from 'vitest';
import LayoutRenderer from './LayoutRenderer.vue';
import type { LayoutNode, LayoutSplitNode } from 'orgnote-api';

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useLayout: () => ({
        normalizeSizes: (sizes: number[]) => sizes,
        updateNodeSizes: vi.fn(),
      }),
    },
  },
}));

const createPaneNode = (paneId: string): LayoutNode => ({
  id: `node-${paneId}`,
  type: 'pane',
  paneId,
});

const createSplitNode = (
  orientation: 'horizontal' | 'vertical',
  children: LayoutNode[],
  sizes?: number[],
): LayoutNode => ({
  id: `split-${Math.random()}`,
  type: 'split',
  orientation,
  children,
  sizes: sizes ?? children.map(() => 100 / children.length),
});

test('renders single pane node', () => {
  const layout = createPaneNode('pane-1');
  const wrapper = shallowMount(LayoutRenderer, {
    props: { layout },
    global: {
      stubs: { AppFlex: false },
    },
  });

  expect(wrapper.find('[data-testid="pane-pane-1"]').exists()).toBe(true);
  expect(wrapper.find('.layout-pane').exists()).toBe(true);
});

test('passes paneId to slot', () => {
  const layout = createPaneNode('pane-123');
  const slotContent = vi.fn();

  shallowMount(LayoutRenderer, {
    props: { layout },
    slots: {
      default: slotContent,
    },
    global: {
      stubs: { AppFlex: false },
    },
  });

  expect(slotContent).toHaveBeenCalledWith({ paneId: 'pane-123' });
});

test('renders horizontal split with two panes', () => {
  const layout = createSplitNode('horizontal', [createPaneNode('left'), createPaneNode('right')]);

  const wrapper = shallowMount(LayoutRenderer, {
    props: { layout },
    global: {
      stubs: { AppFlex: false },
    },
  });

  expect(wrapper.find('.layout-split').exists()).toBe(true);
  expect(wrapper.find('.layout-split.horizontal').exists()).toBe(true);
  expect(wrapper.findAll('.layout-split-child')).toHaveLength(2);
});

test('renders vertical split with two panes', () => {
  const layout = createSplitNode('vertical', [createPaneNode('top'), createPaneNode('bottom')]);

  const wrapper = shallowMount(LayoutRenderer, {
    props: { layout },
    global: {
      stubs: { AppFlex: false },
    },
  });

  expect(wrapper.find('.layout-split.vertical').exists()).toBe(true);
  expect(wrapper.findAll('.layout-split-child')).toHaveLength(2);
});

test('split node renders child LayoutRenderer components', () => {
  const layout = createSplitNode('horizontal', [createPaneNode('left'), createPaneNode('right')]);

  const wrapper = shallowMount(LayoutRenderer, {
    props: { layout },
    global: {
      stubs: { AppFlex: false },
    },
  });

  const childRenderers = wrapper.findAllComponents({ name: 'LayoutRenderer' });
  expect(childRenderers).toHaveLength(2);

  const splitLayout = layout as LayoutSplitNode;
  expect(childRenderers[0]?.props('layout')).toEqual(splitLayout.children[0]);
  expect(childRenderers[1]?.props('layout')).toEqual(splitLayout.children[1]);
});

test('applies correct CSS classes to split nodes', () => {
  const layout = createSplitNode('horizontal', [
    createPaneNode('pane-1'),
    createPaneNode('pane-2'),
  ]);

  const wrapper = shallowMount(LayoutRenderer, {
    props: { layout },
    global: {
      stubs: { AppFlex: false },
    },
  });

  const splitDiv = wrapper.find('.layout-split');
  expect(splitDiv.classes()).toContain('horizontal');
});

test('renders three panes in horizontal split', () => {
  const layout = createSplitNode('horizontal', [
    createPaneNode('left'),
    createPaneNode('center'),
    createPaneNode('right'),
  ]);

  const wrapper = shallowMount(LayoutRenderer, {
    props: { layout },
    global: {
      stubs: { AppFlex: false },
    },
  });

  expect(wrapper.findAll('.layout-split-child')).toHaveLength(3);
  const childRenderers = wrapper.findAllComponents({ name: 'LayoutRenderer' });
  expect(childRenderers).toHaveLength(3);
});

test('vertical split has correct orientation', () => {
  const layout = createSplitNode('vertical', [createPaneNode('top'), createPaneNode('bottom')]);

  const wrapper = shallowMount(LayoutRenderer, {
    props: { layout },
    global: {
      stubs: { AppFlex: false },
    },
  });

  const splitDiv = wrapper.find('.layout-split');
  expect(splitDiv.classes()).toContain('vertical');
  expect(splitDiv.classes()).not.toContain('horizontal');
});
