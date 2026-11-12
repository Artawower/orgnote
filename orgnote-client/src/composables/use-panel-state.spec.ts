import { test, expect } from 'vitest';
import { usePanelState } from './use-panel-state';
import { defineComponent } from 'vue';

const createMockComponent = (name: string) =>
  defineComponent({ name, template: '<div />' });

test('usePanelState should initialize with closed state', () => {
  const panel = usePanelState();
  expect(panel.opened.value).toBe(false);
});

test('usePanelState should initialize with undefined component', () => {
  const panel = usePanelState();
  expect(panel.component.value).toBeUndefined();
});

test('usePanelState.open should set opened to true', () => {
  const panel = usePanelState();
  panel.open();
  expect(panel.opened.value).toBe(true);
});

test('usePanelState.close should set opened to false', () => {
  const panel = usePanelState();
  panel.open();
  panel.close();
  expect(panel.opened.value).toBe(false);
});

test('usePanelState.toggle should switch opened state from false to true', () => {
  const panel = usePanelState();
  panel.toggle();
  expect(panel.opened.value).toBe(true);
});

test('usePanelState.toggle should switch opened state from true to false', () => {
  const panel = usePanelState();
  panel.open();
  panel.toggle();
  expect(panel.opened.value).toBe(false);
});

test('usePanelState.toggle should work correctly when called multiple times', () => {
  const panel = usePanelState();
  panel.toggle();
  panel.toggle();
  panel.toggle();
  expect(panel.opened.value).toBe(true);
});

test('usePanelState.setComponent should replace content without opening panel', () => {
  const panel = usePanelState();
  const mockComponent = createMockComponent('TestComponent');
  const config = { componentProps: { foo: 'bar' } };

  panel.setComponent(mockComponent, config);

  expect(panel.component.value).toBe(mockComponent);
  expect(panel.componentConfig.value).toEqual(config);
  expect(panel.opened.value).toBe(false);
});

test('usePanelState.openComponent should set component and open panel', () => {
  const panel = usePanelState();
  const mockComponent = createMockComponent('TestComponent');

  panel.openComponent(mockComponent);

  expect(panel.component.value).toBe(mockComponent);
  expect(panel.opened.value).toBe(true);
});

test('usePanelState.openComponent should set componentConfig when provided', () => {
  const panel = usePanelState();
  const mockComponent = createMockComponent('TestComponent');
  const config = { componentProps: { foo: 'bar' } };

  panel.openComponent(mockComponent, config);

  expect(panel.componentConfig.value).toEqual(config);
});

test('usePanelState.openComponent should reopen panel with same component after close', () => {
  const panel = usePanelState();
  const mockComponent = createMockComponent('TestComponent');

  panel.openComponent(mockComponent);
  panel.close();
  panel.openComponent(mockComponent);

  expect(panel.opened.value).toBe(true);
  expect(panel.component.value).toBe(mockComponent);
});

test('usePanelState.openComponent should open different component', () => {
  const panel = usePanelState();
  const component1 = createMockComponent('Component1');
  const component2 = createMockComponent('Component2');

  panel.openComponent(component1);
  panel.openComponent(component2);

  expect(panel.component.value).toBe(component2);
  expect(panel.opened.value).toBe(true);
});

test('usePanelState should allow multiple open/close cycles', () => {
  const panel = usePanelState();

  for (let i = 0; i < 10; i++) {
    panel.open();
    expect(panel.opened.value).toBe(true);
    panel.close();
    expect(panel.opened.value).toBe(false);
  }
});

test('usePanelState.openComponent should handle undefined config', () => {
  const panel = usePanelState();
  const mockComponent = createMockComponent('TestComponent');

  panel.openComponent(mockComponent, undefined);

  expect(panel.componentConfig.value).toBeUndefined();
  expect(panel.opened.value).toBe(true);
});
