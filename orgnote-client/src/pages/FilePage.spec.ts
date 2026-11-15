import { beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { defineComponent, h, onMounted, onUnmounted, shallowRef } from 'vue';
import { RouteNames, type BufferViewerEntry } from 'orgnote-api';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import FilePage from './FilePage.vue';

const viewerMounted = vi.fn();
const viewerUnmounted = vi.fn();
const StatefulViewer = defineComponent({
  name: 'StatefulViewer',
  props: ['buffer', 'readonly', 'viewState'],
  setup: () => {
    onMounted(viewerMounted);
    onUnmounted(viewerUnmounted);
    return () => h('div');
  },
});

let viewerEntry: BufferViewerEntry;
const updateBuffer = vi.fn();
const buffer = {
  uri: 'file:///notes/example.org',
  path: '/notes/example.org',
  text: '* Example',
  errors: [],
};
const drawingBuffer = {
  ...buffer,
  uri: 'file:///notes/drawing.excalidraw',
  path: '/notes/drawing.excalidraw',
  text: '{"type":"excalidraw"}',
};

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useBuffers: () => ({
        getBufferByUri: (uri: string) => (uri.endsWith('.excalidraw') ? drawingBuffer : buffer),
        updateBuffer,
      }),
      useBufferViewer: () => ({ getViewer: () => viewerEntry }),
    },
    ui: {
      useScreenDetection: () => ({ tabletBelow: false }),
    },
  },
}));

const route = shallowRef({
  name: RouteNames.File,
  params: { path: '/notes/example.org', tabId: 'tab-1' },
});

const mountFilePage = () =>
  mount(FilePage, {
    global: {
      provide: {
        [TAB_ROUTER_KEY as symbol]: shallowRef({
          currentRoute: route,
        }),
      },
      stubs: {
        MainHeader: true,
        FileNotSupported: true,
        LoadingDots: true,
      },
    },
  });

beforeEach(() => {
  setActivePinia(createPinia());
  updateBuffer.mockReset();
  viewerMounted.mockReset();
  viewerUnmounted.mockReset();
  route.value = {
    name: RouteNames.File,
    params: { path: '/notes/example.org', tabId: 'tab-1' },
  };
  viewerEntry = {
    pattern: '\\.org$',
    component: StatefulViewer,
    meta: {
      id: 'test:stateful-viewer',
      name: 'Stateful Viewer',
      viewState: { version: 1 },
    },
  };
});

test('FilePage gives opted-in viewers a tab-scoped state handle', () => {
  const wrapper = mountFilePage();
  const handle = wrapper.getComponent(StatefulViewer).props('viewState');

  handle.set({ custom: { expanded: true } });

  expect(handle.get()).toEqual({ custom: { expanded: true } });
});

test('FilePage remounts the viewer when the active buffer changes', async () => {
  mountFilePage();
  expect(viewerMounted).toHaveBeenCalledOnce();

  route.value = {
    name: RouteNames.File,
    params: { path: '/notes/drawing.excalidraw', tabId: 'tab-1' },
  };
  await vi.waitFor(() =>
    expect(viewerUnmounted.mock.calls.length).toBeGreaterThanOrEqual(1),
  );

  expect(viewerMounted.mock.calls.length).toBeGreaterThanOrEqual(2);
});

test('FilePage does not pass state handles to viewers without opt-in metadata', () => {
  viewerEntry.meta.viewState = undefined;

  const wrapper = mountFilePage();

  expect(wrapper.getComponent(StatefulViewer).props('viewState')).toBeUndefined();
});
