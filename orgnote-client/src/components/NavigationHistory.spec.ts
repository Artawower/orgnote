import { mount } from '@vue/test-utils';
import { test, expect, vi } from 'vitest';
import { createPinia } from 'pinia';
import type { Router } from 'vue-router';
import NavigationHistory from './NavigationHistory.vue';
import ActionButton from './ActionButton.vue';

const createMockRouter = (): Partial<Router> => ({
  back: vi.fn(),
  push: vi.fn(),
  currentRoute: { value: { name: 'test' } } as Router['currentRoute'],
  options: {} as Router['options'],
  listening: true,
  addRoute: vi.fn(),
  removeRoute: vi.fn(),
  hasRoute: vi.fn(),
  getRoutes: vi.fn(),
  resolve: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  forward: vi.fn(),
  beforeEach: vi.fn(),
  beforeResolve: vi.fn(),
  afterEach: vi.fn(),
  onError: vi.fn(),
  isReady: vi.fn(),
  install: vi.fn(),
});

test('NavigationHistory calls router.back() when no props provided', async () => {
  const mockRouter = createMockRouter();

  const wrapper = mount(NavigationHistory, {
    props: {
      router: mockRouter as Router,
    },
    global: {
      plugins: [createPinia()],
      components: {
        ActionButton,
      },
    },
  });

  await wrapper.find('button').trigger('click');

  expect(mockRouter.back).toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

test('NavigationHistory calls router.push() when "to" prop provided', async () => {
  const mockRouter = createMockRouter();

  const wrapper = mount(NavigationHistory, {
    props: {
      router: mockRouter as Router,
      to: '/test-route',
    },
    global: {
      plugins: [createPinia()],
      components: {
        ActionButton,
      },
    },
  });

  await wrapper.find('button').trigger('click');

  expect(mockRouter.push).toHaveBeenCalledWith('/test-route');
  expect(mockRouter.back).not.toHaveBeenCalled();
});

test('NavigationHistory calls onReturnBack callback when provided', async () => {
  const mockRouter = createMockRouter();
  const mockCallback = vi.fn();

  const wrapper = mount(NavigationHistory, {
    props: {
      router: mockRouter as Router,
      to: '/test-route',
      onReturnBack: mockCallback,
    },
    global: {
      plugins: [createPinia()],
      components: {
        ActionButton,
      },
    },
  });

  await wrapper.find('button').trigger('click');

  expect(mockCallback).toHaveBeenCalled();
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

test('NavigationHistory prioritizes onReturnBack over other navigation methods', async () => {
  const mockRouter = createMockRouter();
  const mockCallback = vi.fn();

  const wrapper = mount(NavigationHistory, {
    props: {
      router: mockRouter as Router,
      to: '/test-route',
      onReturnBack: mockCallback,
    },
    global: {
      plugins: [createPinia()],
      components: {
        ActionButton,
      },
    },
  });

  await wrapper.find('button').trigger('click');

  expect(mockCallback).toHaveBeenCalled();
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
});
