import { test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRightSidebarStore } from './right-sidebar';
import { defineComponent } from 'vue';

const createMockComponent = (name: string) =>
  defineComponent({ name, template: '<div />' });

beforeEach(() => {
  setActivePinia(createPinia());
});

test('useRightSidebarStore should initialize with default width 300', () => {
  const store = useRightSidebarStore();
  expect(store.width).toBe(300);
});

test('useRightSidebarStore should initialize with closed state', () => {
  const store = useRightSidebarStore();
  expect(store.opened).toBe(false);
});

test('useRightSidebarStore.setWidth should update width within bounds', () => {
  const store = useRightSidebarStore();
  store.setWidth(400);
  expect(store.width).toBe(400);
});

test('useRightSidebarStore.setWidth should clamp to minimum 200', () => {
  const store = useRightSidebarStore();
  store.setWidth(100);
  expect(store.width).toBe(200);
});

test('useRightSidebarStore.setWidth should clamp to maximum 600', () => {
  const store = useRightSidebarStore();
  store.setWidth(800);
  expect(store.width).toBe(600);
});

test('useRightSidebarStore.setWidth should handle negative values', () => {
  const store = useRightSidebarStore();
  store.setWidth(-100);
  expect(store.width).toBe(200);
});

test('useRightSidebarStore.setWidth should handle zero', () => {
  const store = useRightSidebarStore();
  store.setWidth(0);
  expect(store.width).toBe(200);
});

test('useRightSidebarStore.setWidth should handle exact minimum boundary', () => {
  const store = useRightSidebarStore();
  store.setWidth(200);
  expect(store.width).toBe(200);
});

test('useRightSidebarStore.setWidth should handle exact maximum boundary', () => {
  const store = useRightSidebarStore();
  store.setWidth(600);
  expect(store.width).toBe(600);
});

test('useRightSidebarStore.setWidth should handle float values', () => {
  const store = useRightSidebarStore();
  store.setWidth(350.5);
  expect(store.width).toBe(350.5);
});

test('useRightSidebarStore.setWidth should ignore NaN and keep previous value', () => {
  const store = useRightSidebarStore();
  store.setWidth(400);
  store.setWidth(NaN);
  expect(store.width).toBe(400);
});

test('useRightSidebarStore.setWidth should handle Infinity by clamping to maximum', () => {
  const store = useRightSidebarStore();
  store.setWidth(Infinity);
  expect(store.width).toBe(600);
});

test('useRightSidebarStore.open should set opened to true', () => {
  const store = useRightSidebarStore();
  store.open();
  expect(store.opened).toBe(true);
});

test('useRightSidebarStore.close should set opened to false', () => {
  const store = useRightSidebarStore();
  store.open();
  store.close();
  expect(store.opened).toBe(false);
});

test('useRightSidebarStore.toggle should switch opened state', () => {
  const store = useRightSidebarStore();
  store.toggle();
  expect(store.opened).toBe(true);
  store.toggle();
  expect(store.opened).toBe(false);
});

test('useRightSidebarStore.openComponent should set component and open sidebar', () => {
  const store = useRightSidebarStore();
  const mockComponent = createMockComponent('TestSidebar');

  store.openComponent(mockComponent);

  expect(store.component).toBe(mockComponent);
  expect(store.opened).toBe(true);
});

test('useRightSidebarStore should persist state across multiple accesses', () => {
  const store1 = useRightSidebarStore();
  store1.setWidth(450);
  store1.open();

  const store2 = useRightSidebarStore();
  expect(store2.width).toBe(450);
  expect(store2.opened).toBe(true);
});

test('useRightSidebarStore.setWidth should handle rapid consecutive calls', () => {
  const store = useRightSidebarStore();

  store.setWidth(250);
  store.setWidth(350);
  store.setWidth(450);
  store.setWidth(550);

  expect(store.width).toBe(550);
});

test('useRightSidebarStore should handle width at boundary after component change', () => {
  const store = useRightSidebarStore();
  const component = createMockComponent('Sidebar');

  store.setWidth(600);
  store.openComponent(component);

  expect(store.width).toBe(600);
  expect(store.opened).toBe(true);
});
