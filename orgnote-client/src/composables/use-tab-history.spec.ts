import { test, expect, vi } from 'vitest';
import { shallowRef, ref, nextTick } from 'vue';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

const mockNotify = vi.fn();

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useNotifications: () => ({
        notify: mockNotify,
      }),
    },
  },
}));

import { useTabHistory } from './use-tab-history';

const createMockRoute = (fullPath: string): RouteLocationNormalizedLoaded =>
  ({
    fullPath,
    path: fullPath,
    name: 'test',
    params: {},
    query: {},
    hash: '',
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  }) as unknown as RouteLocationNormalizedLoaded;

const createMockRouter = (initialPath = '/'): Router => {
  const currentRoute = ref(createMockRoute(initialPath));

  return {
    currentRoute,
    back: vi.fn(),
    forward: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    beforeEach: vi.fn(),
    beforeResolve: vi.fn(),
    afterEach: vi.fn(),
    onError: vi.fn(),
    isReady: vi.fn(),
    install: vi.fn(),
    addRoute: vi.fn(),
    removeRoute: vi.fn(),
    hasRoute: vi.fn(),
    getRoutes: vi.fn(),
    resolve: vi.fn(),
    options: {} as Router['options'],
    listening: true,
  } as unknown as Router;
};

const navigateTo = async (router: Router, path: string) => {
  (router.currentRoute as unknown as { value: RouteLocationNormalizedLoaded }).value =
    createMockRoute(path);
  await nextTick();
};

test('useTabHistory initializes with canGoBack false when router is undefined', () => {
  const tabRouter = shallowRef<Router | undefined>(undefined);
  const { canGoBack, canGoForward } = useTabHistory(tabRouter);

  expect(canGoBack.value).toBe(false);
  expect(canGoForward.value).toBe(false);
});

test('useTabHistory initializes with canGoBack false on first route', () => {
  const router = createMockRouter('/home');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { canGoBack, canGoForward } = useTabHistory(tabRouter);

  expect(canGoBack.value).toBe(false);
  expect(canGoForward.value).toBe(false);
});

test('useTabHistory canGoBack becomes true after navigating to second route', async () => {
  const router = createMockRouter('/home');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { canGoBack } = useTabHistory(tabRouter);

  await navigateTo(router, '/about');

  expect(canGoBack.value).toBe(true);
});

test('useTabHistory canGoForward becomes true after going back', async () => {
  const router = createMockRouter('/home');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { canGoForward } = useTabHistory(tabRouter);

  await navigateTo(router, '/about');
  await navigateTo(router, '/home');

  expect(canGoForward.value).toBe(true);
});

test('useTabHistory tracks multiple navigations', async () => {
  const router = createMockRouter('/a');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { canGoBack, canGoForward } = useTabHistory(tabRouter);

  await navigateTo(router, '/b');
  await navigateTo(router, '/c');

  expect(canGoBack.value).toBe(true);
  expect(canGoForward.value).toBe(false);
});

test('useTabHistory forward history is truncated on new navigation after back', async () => {
  const router = createMockRouter('/a');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { canGoBack, canGoForward } = useTabHistory(tabRouter);

  await navigateTo(router, '/b');
  await navigateTo(router, '/c');
  await navigateTo(router, '/b');
  await navigateTo(router, '/d');

  expect(canGoBack.value).toBe(true);
  expect(canGoForward.value).toBe(false);
});

test('useTabHistory resets history when tabRouter changes', async () => {
  const router1 = createMockRouter('/page1');
  const tabRouter = shallowRef<Router | undefined>(router1);
  const { canGoBack, canGoForward } = useTabHistory(tabRouter);

  await navigateTo(router1, '/page2');
  expect(canGoBack.value).toBe(true);

  const router2 = createMockRouter('/new-tab');
  tabRouter.value = router2;
  await nextTick();

  expect(canGoBack.value).toBe(false);
  expect(canGoForward.value).toBe(false);
});

test('useTabHistory resets history when tabRouter becomes undefined', async () => {
  const router = createMockRouter('/home');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { canGoBack } = useTabHistory(tabRouter);

  await navigateTo(router, '/about');
  expect(canGoBack.value).toBe(true);

  tabRouter.value = undefined;
  await nextTick();

  expect(canGoBack.value).toBe(false);
});

test('useTabHistory handleNavigation back calls router.back()', async () => {
  const router = createMockRouter('/a');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { handleNavigation } = useTabHistory(tabRouter);

  await navigateTo(router, '/b');

  handleNavigation('back');

  expect(router.back).toHaveBeenCalled();
});

test('useTabHistory handleNavigation forward calls router.forward()', async () => {
  const router = createMockRouter('/a');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { handleNavigation } = useTabHistory(tabRouter);

  await navigateTo(router, '/b');
  await navigateTo(router, '/a');

  handleNavigation('forward');

  expect(router.forward).toHaveBeenCalled();
});

test('useTabHistory handleNavigation back does nothing when canGoBack is false', () => {
  const router = createMockRouter('/home');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { handleNavigation } = useTabHistory(tabRouter);

  handleNavigation('back');

  expect(router.back).not.toHaveBeenCalled();
});

test('useTabHistory handleNavigation forward does nothing when canGoForward is false', () => {
  const router = createMockRouter('/home');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { handleNavigation } = useTabHistory(tabRouter);

  handleNavigation('forward');

  expect(router.forward).not.toHaveBeenCalled();
});

test('useTabHistory handleNavigation notifies when router is undefined', () => {
  const tabRouter = shallowRef<Router | undefined>(undefined);
  const { handleNavigation } = useTabHistory(tabRouter);

  mockNotify.mockClear();
  handleNavigation('back');

  expect(mockNotify).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'Router not available', level: 'danger' }),
  );
});

test('useTabHistory ignores duplicate route changes', async () => {
  const router = createMockRouter('/home');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { canGoBack } = useTabHistory(tabRouter);

  await navigateTo(router, '/home');

  expect(canGoBack.value).toBe(false);
});

test('useTabHistory detects back navigation correctly', async () => {
  const router = createMockRouter('/a');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { canGoBack, canGoForward } = useTabHistory(tabRouter);

  await navigateTo(router, '/b');
  await navigateTo(router, '/c');

  expect(canGoBack.value).toBe(true);
  expect(canGoForward.value).toBe(false);

  await navigateTo(router, '/b');

  expect(canGoBack.value).toBe(true);
  expect(canGoForward.value).toBe(true);

  await navigateTo(router, '/a');

  expect(canGoBack.value).toBe(false);
  expect(canGoForward.value).toBe(true);
});

test('useTabHistory detects forward navigation correctly', async () => {
  const router = createMockRouter('/a');
  const tabRouter = shallowRef<Router | undefined>(router);
  const { canGoBack, canGoForward } = useTabHistory(tabRouter);

  await navigateTo(router, '/b');
  await navigateTo(router, '/c');
  await navigateTo(router, '/b');
  await navigateTo(router, '/a');

  expect(canGoForward.value).toBe(true);

  await navigateTo(router, '/b');

  expect(canGoBack.value).toBe(true);
  expect(canGoForward.value).toBe(true);

  await navigateTo(router, '/c');

  expect(canGoBack.value).toBe(true);
  expect(canGoForward.value).toBe(false);
});
