import { flushPromises, mount } from '@vue/test-utils';
import { buildBufferUri, RouteNames, type Buffer as OrgBuffer } from 'orgnote-api';
import { nextTick, shallowRef, type ShallowRef } from 'vue';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';
import { beforeEach, expect, test, vi } from 'vitest';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import AppBuffer from './AppBuffer.vue';

const bufferMocks = vi.hoisted(() => ({
  getOrCreateBuffer: vi.fn(),
  releaseBuffer: vi.fn(),
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useBuffers: () => bufferMocks,
    },
  },
}));

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const createRoute = (path: string): RouteLocationNormalizedLoaded =>
  ({ name: RouteNames.File, params: { path } }) as unknown as RouteLocationNormalizedLoaded;

const createBuffer = (uri: string, errors: unknown[] = []): OrgBuffer =>
  ({ uri, errors }) as OrgBuffer;

const mountAppBuffer = (currentRoute: ShallowRef<RouteLocationNormalizedLoaded>) => {
  const tabRouter = shallowRef({ currentRoute } as unknown as Router);
  return mount(AppBuffer, {
    global: {
      provide: { [TAB_ROUTER_KEY as symbol]: tabRouter },
      stubs: {
        ErrorDisplay: { template: '<div data-testid="buffer-errors" />' },
        RouterView: { template: '<div data-testid="buffer-content" />' },
      },
    },
  });
};

beforeEach(() => {
  bufferMocks.getOrCreateBuffer.mockReset();
  bufferMocks.releaseBuffer.mockReset();
});

test('AppBuffer keeps the newest route active when buffer loads finish out of order', async () => {
  const firstUri = buildBufferUri('file', '/notes/first.org');
  const secondUri = buildBufferUri('file', '/notes/second.org');
  const firstLoad = createDeferred<OrgBuffer>();
  const secondLoad = createDeferred<OrgBuffer>();
  bufferMocks.getOrCreateBuffer.mockImplementation((uri: string) =>
    uri === firstUri ? firstLoad.promise : secondLoad.promise,
  );

  const currentRoute = shallowRef(createRoute('/notes/first.org'));
  const wrapper = mountAppBuffer(currentRoute);

  currentRoute.value = createRoute('/notes/second.org');
  await nextTick();
  secondLoad.resolve(createBuffer(secondUri));
  await flushPromises();
  firstLoad.resolve(createBuffer(firstUri, [{ message: 'stale failure' }]));
  await flushPromises();

  expect(wrapper.find('[data-testid="buffer-errors"]').exists()).toBe(false);
  expect(wrapper.find('[data-testid="buffer-content"]').exists()).toBe(true);
  wrapper.unmount();
});

test('AppBuffer releases a buffer loaded after its route was invalidated', async () => {
  const firstUri = buildBufferUri('file', '/notes/first.org');
  const secondUri = buildBufferUri('file', '/notes/second.org');
  const firstLoad = createDeferred<OrgBuffer>();
  const secondLoad = createDeferred<OrgBuffer>();
  bufferMocks.getOrCreateBuffer.mockImplementation((uri: string) =>
    uri === firstUri ? firstLoad.promise : secondLoad.promise,
  );

  const currentRoute = shallowRef(createRoute('/notes/first.org'));
  const wrapper = mountAppBuffer(currentRoute);
  currentRoute.value = createRoute('/notes/second.org');
  await nextTick();
  firstLoad.resolve(createBuffer(firstUri));
  await flushPromises();

  expect(bufferMocks.releaseBuffer).toHaveBeenCalledOnce();
  expect(bufferMocks.releaseBuffer).toHaveBeenCalledWith(firstUri);

  secondLoad.resolve(createBuffer(secondUri));
  await flushPromises();
  wrapper.unmount();
});

test('AppBuffer releases a buffer that finishes loading after unmount', async () => {
  const uri = buildBufferUri('file', '/notes/first.org');
  const load = createDeferred<OrgBuffer>();
  bufferMocks.getOrCreateBuffer.mockReturnValue(load.promise);

  const wrapper = mountAppBuffer(shallowRef(createRoute('/notes/first.org')));
  wrapper.unmount();
  load.resolve(createBuffer(uri));
  await flushPromises();

  expect(bufferMocks.releaseBuffer).toHaveBeenCalledOnce();
  expect(bufferMocks.releaseBuffer).toHaveBeenCalledWith(uri);
});
