import { test, expect } from 'vitest';
import { ref } from 'vue';
import { useValueResize } from './use-value-resize';

const createMockElement = (parentWidth = 1000, parentHeight = 800): HTMLElement => {
  const parent = document.createElement('div');
  Object.defineProperty(parent, 'offsetWidth', { value: parentWidth });
  Object.defineProperty(parent, 'offsetHeight', { value: parentHeight });

  const element = document.createElement('div');
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

test('useValueResize should initialize with isResizing false', () => {
  const value = ref(50);
  const { isResizing } = useValueResize('horizontal', value);
  expect(isResizing.value).toBe(false);
});

test('useValueResize should not modify value before resize starts', () => {
  const value = ref(300);
  useValueResize('horizontal', value, { unit: 'pixel' });
  expect(value.value).toBe(300);
});

test('useValueResize.handleResizeStart should set isResizing to true', () => {
  const value = ref(50);
  const { isResizing, handleResizeStart } = useValueResize('horizontal', value);

  const element = createMockElement();
  const event = createMouseEvent('mousedown', element, 100);
  handleResizeStart(event);

  expect(isResizing.value).toBe(true);
});

test('useValueResize should update value in pixel mode on mousemove', () => {
  const value = ref(300);
  const { handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'pixel',
    min: 0,
    max: 1000,
  });

  const element = createMockElement();
  handleResizeStart(createMouseEvent('mousedown', element, 100));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));

  expect(value.value).toBe(350);
});

test('useValueResize should update value in percent mode on mousemove', () => {
  const value = ref(50);
  const { handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'percent',
    min: 0,
    max: 100,
  });

  const element = createMockElement(1000);
  handleResizeStart(createMouseEvent('mousedown', element, 100));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));

  expect(value.value).toBe(60);
});

test('useValueResize should clamp value to minimum', () => {
  const value = ref(300);
  const { handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'pixel',
    min: 200,
    max: 600,
  });

  const element = createMockElement();
  handleResizeStart(createMouseEvent('mousedown', element, 500));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0 }));

  expect(value.value).toBe(200);
});

test('useValueResize should clamp value to maximum', () => {
  const value = ref(300);
  const { handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'pixel',
    min: 200,
    max: 600,
  });

  const element = createMockElement();
  handleResizeStart(createMouseEvent('mousedown', element, 100));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 1000 }));

  expect(value.value).toBe(600);
});

test('useValueResize should reverse delta when reverse option is true', () => {
  const value = ref(300);
  const { handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'pixel',
    min: 0,
    max: 1000,
    reverse: true,
  });

  const element = createMockElement();
  handleResizeStart(createMouseEvent('mousedown', element, 100));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));

  expect(value.value).toBe(250);
});

test('useValueResize should use vertical position for vertical orientation', () => {
  const value = ref(50);
  const { handleResizeStart } = useValueResize('vertical', value, {
    unit: 'percent',
    min: 0,
    max: 100,
  });

  const element = createMockElement(1000, 800);
  handleResizeStart(createMouseEvent('mousedown', element, 0, 100));
  document.dispatchEvent(new MouseEvent('mousemove', { clientY: 180 }));

  expect(value.value).toBe(60);
});

test('useValueResize should stop resizing on mouseup', () => {
  const value = ref(300);
  const { isResizing, handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'pixel',
  });

  const element = createMockElement();
  handleResizeStart(createMouseEvent('mousedown', element, 100));
  document.dispatchEvent(new MouseEvent('mouseup'));

  expect(isResizing.value).toBe(false);
});

test('useValueResize should use default options when not provided', () => {
  const value = ref(50);
  const { handleResizeStart } = useValueResize('horizontal', value);

  const element = createMockElement(1000);
  handleResizeStart(createMouseEvent('mousedown', element, 100));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));

  expect(value.value).toBe(60);
});

test('useValueResize should handle element without parent gracefully', () => {
  const value = ref(300);
  const { handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'pixel',
  });

  const orphanElement = document.createElement('div');
  handleResizeStart(createMouseEvent('mousedown', orphanElement, 100));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));

  expect(value.value).toBe(300);
});

test('useValueResize should handle zero container size gracefully', () => {
  const value = ref(300);
  const { handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'percent',
  });

  const element = createMockElement(0);
  handleResizeStart(createMouseEvent('mousedown', element, 100));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));

  expect(value.value).toBe(300);
});

test('useValueResize should handle multiple resize sessions independently', () => {
  const value = ref(300);
  const { handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'pixel',
    min: 0,
    max: 1000,
  });

  const element = createMockElement();

  handleResizeStart(createMouseEvent('mousedown', element, 100));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
  document.dispatchEvent(new MouseEvent('mouseup'));
  expect(value.value).toBe(350);

  handleResizeStart(createMouseEvent('mousedown', element, 200));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300 }));
  expect(value.value).toBe(450);
});

test('useValueResize should handle negative delta correctly', () => {
  const value = ref(500);
  const { handleResizeStart } = useValueResize('horizontal', value, {
    unit: 'pixel',
    min: 0,
    max: 1000,
  });

  const element = createMockElement();
  handleResizeStart(createMouseEvent('mousedown', element, 200));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));

  expect(value.value).toBe(400);
});
