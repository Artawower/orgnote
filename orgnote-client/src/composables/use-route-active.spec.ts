import { test, expect, vi } from 'vitest';
import { useRouteActive } from './use-route-active';
import type { Router } from 'vue-router';
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';
import { ref } from 'vue';

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    name: 'default-route',
    matched: [],
    params: {},
    query: {},
    fullPath: '/',
    hash: '',
    redirectedFrom: undefined,
    meta: {},
    value: {
      name: 'name',
    },
  })),
}));

function createMockRouter(currentRoute: Partial<RouteLocationNormalizedLoaded> | null) {
  return {
    currentRoute: ref(currentRoute),
  } as unknown as Router;
}

test('returns true when the route is active with custom router', () => {
  const customRouter = createMockRouter({ name: 'home' });

  const { isActive } = useRouteActive(customRouter);
  expect(isActive('home')).toBe(true);
});

test('returns false when the route is not active with custom router', () => {
  const customRouter = createMockRouter({ name: 'about' });

  const { isActive } = useRouteActive(customRouter);
  expect(isActive('home')).toBe(false);
});

test('returns true when the route is active with default router', () => {
  vi.mocked(useRoute).mockReturnValue({ name: 'home' } as RouteLocationNormalizedLoaded);

  const { isActive } = useRouteActive();
  expect(isActive('home')).toBe(true);
});

test('returns false when the route is not active with default router', () => {
  vi.mocked(useRoute).mockReturnValue({ name: 'about' } as RouteLocationNormalizedLoaded);

  const { isActive } = useRouteActive();
  expect(isActive('home')).toBe(false);
});

test('returns false when the route name is undefined with custom router', () => {
  const customRouter = createMockRouter({ name: undefined });

  const { isActive } = useRouteActive(customRouter);
  expect(isActive('home')).toBe(false);
});

test('returns false when the route name is undefined with default router', () => {
  vi.mocked(useRoute).mockReturnValue({ name: undefined } as RouteLocationNormalizedLoaded);

  const { isActive } = useRouteActive();
  expect(isActive('home')).toBe(false);
});

test('handles null currentRoute gracefully with custom router', () => {
  const customRouter = createMockRouter(null);

  const { isActive } = useRouteActive(customRouter);
  expect(isActive('home')).toBe(false);
});

test('handles undefined route name gracefully', () => {
  vi.mocked(useRoute).mockReturnValue({
    name: undefined,
    matched: [],
    params: {},
    query: {},
    fullPath: '/',
    hash: '',
    path: '/',
    redirectedFrom: undefined,
    meta: {},
  } as RouteLocationNormalizedLoaded);

  const { isActive } = useRouteActive();
  expect(isActive('home')).toBe(false);
});
