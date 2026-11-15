import { test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { defineAsyncComponent, defineComponent } from 'vue';
import { useSidebarStore } from './sidebar';

const ComponentA = defineComponent({ template: '<div>A</div>' });
const ComponentB = defineComponent({ template: '<div>B</div>' });

beforeEach(() => {
  setActivePinia(createPinia());
});

test('sidebar_setComponentWhenClosed_preservesClosedState', () => {
  const sidebar = useSidebarStore();

  sidebar.setComponent(ComponentA);

  expect(sidebar.opened).toBe(false);
  expect(sidebar.component).toBe(ComponentA);
});

test('sidebar_setComponentWhenOpen_preservesOpenState', () => {
  const sidebar = useSidebarStore();
  sidebar.openComponent(ComponentA);

  sidebar.setComponent(ComponentB);

  expect(sidebar.opened).toBe(true);
  expect(sidebar.component).toBe(ComponentB);
});

test('sidebar_openWithComponentA_opensWithComponentA', () => {
  const sidebar = useSidebarStore();
  sidebar.openComponent(ComponentA);
  expect(sidebar.opened).toBe(true);
  expect(sidebar.component).toBe(ComponentA);
});

test('sidebar_openDifferentComponentWhenOpen_switchesContent', () => {
  const sidebar = useSidebarStore();
  sidebar.openComponent(ComponentA);

  sidebar.openComponent(ComponentB);

  expect(sidebar.opened).toBe(true);
  expect(sidebar.component).toBe(ComponentB);
});

test('sidebar_openSameComponentWhenOpen_closes', () => {
  const sidebar = useSidebarStore();
  sidebar.openComponent(ComponentA);

  sidebar.openComponent(ComponentA);

  expect(sidebar.opened).toBe(false);
});

test('sidebar_openSameComponentWhenClosed_opens', () => {
  const sidebar = useSidebarStore();
  sidebar.openComponent(ComponentA);
  sidebar.close();

  sidebar.openComponent(ComponentA);

  expect(sidebar.opened).toBe(true);
  expect(sidebar.component).toBe(ComponentA);
});

test('sidebar_openStableAsyncRefTwice_closesOnSecondCall', () => {
  const sidebar = useSidebarStore();
  const StableRef = defineAsyncComponent(() => Promise.resolve({ template: '<div/>' }));

  sidebar.openComponent(StableRef);
  expect(sidebar.opened).toBe(true);

  sidebar.openComponent(StableRef);

  expect(sidebar.opened).toBe(false);
});
