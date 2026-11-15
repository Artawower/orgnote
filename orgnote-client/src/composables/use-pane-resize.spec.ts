import { test, expect, vi } from 'vitest';
import { usePaneResize } from './use-pane-resize';

const createMockElement = (
  parentWidth = 1000,
  parentHeight = 800,
  elementWidth = 4,
  elementHeight = 4,
): HTMLElement => {
  const parent = document.createElement('div');
  Object.defineProperty(parent, 'offsetWidth', { value: parentWidth });
  Object.defineProperty(parent, 'offsetHeight', { value: parentHeight });

  const element = document.createElement('div');
  Object.defineProperty(element, 'offsetWidth', { value: elementWidth });
  Object.defineProperty(element, 'offsetHeight', { value: elementHeight });
  parent.appendChild(element);

  return element;
};

const createMouseEvent = (
  type: string,
  target: HTMLElement,
  clientX = 0,
  clientY = 0,
): MouseEvent => {
  const event = new MouseEvent(type, {
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'target', { value: target });
  return event;
};

const getLastCall = (mock: ReturnType<typeof vi.fn>): number[] => {
  const calls = mock.mock.calls;
  return calls[calls.length - 1]![0] as number[];
};

const getCall = (mock: ReturnType<typeof vi.fn>, index: number): number[] => {
  return mock.mock.calls[index]![0] as number[];
};

test('usePaneResize should initialize with isResizing false', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { isResizing } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  expect(isResizing.value).toBe(false);
});

test('usePaneResize.handleResizeStart should set isResizing to true', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { isResizing, handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement();
  handleResizeStart(createMouseEvent('mousedown', element, 100));

  expect(isResizing.value).toBe(true);
});

test('usePaneResize should call onUpdate with new sizes on resize', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement(1000 + 4);
  handleResizeStart(createMouseEvent('mousedown', element, 500));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 600 }));

  expect(onUpdate).toHaveBeenCalled();
  const newSizes = getCall(onUpdate, 0);
  expect(newSizes[0]).toBeGreaterThan(50);
  expect(newSizes[1]).toBeLessThan(50);
});

test('usePaneResize should clamp left pane to minimum 25%', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement(1000 + 4);
  handleResizeStart(createMouseEvent('mousedown', element, 500));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0 }));

  expect(onUpdate).toHaveBeenCalled();
  const newSizes = getLastCall(onUpdate);
  expect(newSizes[0]).toBeGreaterThanOrEqual(25);
});

test('usePaneResize should clamp right pane to minimum 25%', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement(1000 + 4);
  handleResizeStart(createMouseEvent('mousedown', element, 500));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 1000 }));

  expect(onUpdate).toHaveBeenCalled();
  const newSizes = getLastCall(onUpdate);
  expect(newSizes[1]).toBeGreaterThanOrEqual(25);
});

test('usePaneResize should preserve total of adjacent panes', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement(1000 + 4);
  handleResizeStart(createMouseEvent('mousedown', element, 500));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 600 }));

  const newSizes = getCall(onUpdate, 0);
  expect(newSizes[0]! + newSizes[1]!).toBeCloseTo(100, 1);
});

test('usePaneResize should work with vertical orientation', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('vertical', () => sizes, 0, onUpdate);

  const element = createMockElement(1000, 800 + 4, 4, 4);
  handleResizeStart(createMouseEvent('mousedown', element, 0, 400));
  document.dispatchEvent(new MouseEvent('mousemove', { clientY: 480 }));

  expect(onUpdate).toHaveBeenCalled();
  const newSizes = getCall(onUpdate, 0);
  expect(newSizes[0]).toBeGreaterThan(50);
});

test('usePaneResize should handle three panes with middle splitter', () => {
  const sizes = [33.33, 33.33, 33.34];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 1, onUpdate);

  const element = createMockElement(1000 + 8, 800, 4, 4);
  handleResizeStart(createMouseEvent('mousedown', element, 666));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 700 }));

  expect(onUpdate).toHaveBeenCalled();
  const newSizes = getCall(onUpdate, 0);
  expect(newSizes[0]).toBeCloseTo(33.33, 1);
  expect(newSizes[1]).toBeGreaterThan(33.33);
  expect(newSizes[2]).toBeLessThan(33.34);
});

test('usePaneResize should stop resizing on mouseup', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { isResizing, handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement();
  handleResizeStart(createMouseEvent('mousedown', element, 500));
  document.dispatchEvent(new MouseEvent('mouseup'));

  expect(isResizing.value).toBe(false);
});

test('usePaneResize should handle element without parent gracefully', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const orphanElement = document.createElement('div');
  handleResizeStart(createMouseEvent('mousedown', orphanElement, 500));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 600 }));

  expect(onUpdate).not.toHaveBeenCalled();
});

test('usePaneResize should handle zero container size gracefully', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement(4);
  handleResizeStart(createMouseEvent('mousedown', element, 2));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));

  expect(onUpdate).not.toHaveBeenCalled();
});

test('usePaneResize should handle uneven initial sizes', () => {
  const sizes = [30, 70];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement(1000 + 4);
  handleResizeStart(createMouseEvent('mousedown', element, 300));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));

  expect(onUpdate).toHaveBeenCalled();
  const newSizes = getCall(onUpdate, 0);
  expect(newSizes[0]).toBeGreaterThan(30);
  expect(newSizes[1]).toBeLessThan(70);
  expect(newSizes[0]! + newSizes[1]!).toBeCloseTo(100, 1);
});

test('usePaneResize should snapshot sizes at resize start', () => {
  let sizes = [50, 50];
  const onUpdate = vi.fn((newSizes: number[]) => {
    sizes = newSizes;
  });
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement(1000 + 4);
  handleResizeStart(createMouseEvent('mousedown', element, 500));

  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 550 }));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 600 }));

  const firstDelta = getCall(onUpdate, 0)[0]! - 50;
  const secondDelta = getCall(onUpdate, 1)[0]! - 50;

  expect(secondDelta).toBeGreaterThan(firstDelta);
});

test('usePaneResize should handle negative delta (resize left)', () => {
  const sizes = [50, 50];
  const onUpdate = vi.fn();
  const { handleResizeStart } = usePaneResize('horizontal', () => sizes, 0, onUpdate);

  const element = createMockElement(1000 + 4);
  handleResizeStart(createMouseEvent('mousedown', element, 500));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));

  const newSizes = getCall(onUpdate, 0);
  expect(newSizes[0]).toBeLessThan(50);
  expect(newSizes[1]).toBeGreaterThan(50);
});
