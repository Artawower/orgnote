import { test, expect, vi } from 'vitest';
import { useResize } from './use-resize';
import { nextTick } from 'vue';

const createMouseEvent = (type: string, clientX = 0, clientY = 0): MouseEvent => {
  return new MouseEvent(type, {
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
  });
};

test('useResize should initialize with isResizing false', () => {
  const onResize = vi.fn();
  const { isResizing } = useResize('horizontal', onResize);
  expect(isResizing.value).toBe(false);
});

test('useResize.startResize should set isResizing to true', () => {
  const onResize = vi.fn();
  const { isResizing, startResize } = useResize('horizontal', onResize);

  const event = createMouseEvent('mousedown', 100, 50);
  startResize(event);

  expect(isResizing.value).toBe(true);
});

test('useResize.startResize should prevent default event behavior', () => {
  const onResize = vi.fn();
  const { startResize } = useResize('horizontal', onResize);

  const event = createMouseEvent('mousedown');
  const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
  const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

  startResize(event);

  expect(preventDefaultSpy).toHaveBeenCalled();
  expect(stopPropagationSpy).toHaveBeenCalled();
});

test('useResize.stopResize should set isResizing to false', () => {
  const onResize = vi.fn();
  const { isResizing, startResize, stopResize } = useResize('horizontal', onResize);

  const event = createMouseEvent('mousedown', 100);
  startResize(event);
  stopResize();

  expect(isResizing.value).toBe(false);
});

test('useResize should call onResize with delta on horizontal mousemove', () => {
  const onResize = vi.fn();
  const { startResize } = useResize('horizontal', onResize);

  const startEvent = createMouseEvent('mousedown', 100, 50);
  startResize(startEvent);

  const moveEvent = createMouseEvent('mousemove', 150, 50);
  document.dispatchEvent(moveEvent);

  expect(onResize).toHaveBeenCalledWith(50);
});

test('useResize should call onResize with delta on vertical mousemove', () => {
  const onResize = vi.fn();
  const { startResize } = useResize('vertical', onResize);

  const startEvent = createMouseEvent('mousedown', 50, 100);
  startResize(startEvent);

  const moveEvent = createMouseEvent('mousemove', 50, 180);
  document.dispatchEvent(moveEvent);

  expect(onResize).toHaveBeenCalledWith(80);
});

test('useResize should not call onResize when not resizing', () => {
  const onResize = vi.fn();
  useResize('horizontal', onResize);

  const moveEvent = createMouseEvent('mousemove', 150, 50);
  document.dispatchEvent(moveEvent);

  expect(onResize).not.toHaveBeenCalled();
});

test('useResize should stop resizing on mouseup', () => {
  const onResize = vi.fn();
  const { isResizing, startResize } = useResize('horizontal', onResize);

  const startEvent = createMouseEvent('mousedown', 100);
  startResize(startEvent);

  const mouseUpEvent = createMouseEvent('mouseup');
  document.dispatchEvent(mouseUpEvent);

  expect(isResizing.value).toBe(false);
});

test('useResize should calculate negative delta when moving left', () => {
  const onResize = vi.fn();
  const { startResize } = useResize('horizontal', onResize);

  const startEvent = createMouseEvent('mousedown', 200);
  startResize(startEvent);

  const moveEvent = createMouseEvent('mousemove', 150);
  document.dispatchEvent(moveEvent);

  expect(onResize).toHaveBeenCalledWith(-50);
});

test('useResize should calculate negative delta when moving up', () => {
  const onResize = vi.fn();
  const { startResize } = useResize('vertical', onResize);

  const startEvent = createMouseEvent('mousedown', 0, 200);
  startResize(startEvent);

  const moveEvent = createMouseEvent('mousemove', 0, 100);
  document.dispatchEvent(moveEvent);

  expect(onResize).toHaveBeenCalledWith(-100);
});

test('useResize should set cursor style when resizing horizontally', async () => {
  const onResize = vi.fn();
  const { startResize } = useResize('horizontal', onResize);

  const event = createMouseEvent('mousedown', 100);
  startResize(event);

  await nextTick();

  expect(document.body.style.cursor).toBe('col-resize');
  expect(document.body.style.userSelect).toBe('none');
});

test('useResize should set cursor style when resizing vertically', async () => {
  const onResize = vi.fn();
  const { startResize } = useResize('vertical', onResize);

  const event = createMouseEvent('mousedown', 0, 100);
  startResize(event);

  await nextTick();

  expect(document.body.style.cursor).toBe('row-resize');
});

test('useResize should reset cursor style when stopping resize', async () => {
  const onResize = vi.fn();
  const { startResize, stopResize } = useResize('horizontal', onResize);

  const event = createMouseEvent('mousedown', 100);
  startResize(event);
  await nextTick();

  stopResize();
  await nextTick();

  expect(document.body.style.cursor).toBe('');
  expect(document.body.style.userSelect).toBe('');
});

test('useResize should handle multiple resize sessions', () => {
  const onResize = vi.fn();
  const { startResize, stopResize } = useResize('horizontal', onResize);

  startResize(createMouseEvent('mousedown', 100));
  document.dispatchEvent(createMouseEvent('mousemove', 150));
  stopResize();

  startResize(createMouseEvent('mousedown', 200));
  document.dispatchEvent(createMouseEvent('mousemove', 300));
  stopResize();

  expect(onResize).toHaveBeenCalledWith(50);
  expect(onResize).toHaveBeenCalledWith(100);
});

test('useResize should handle zero delta', () => {
  const onResize = vi.fn();
  const { startResize } = useResize('horizontal', onResize);

  startResize(createMouseEvent('mousedown', 100));
  document.dispatchEvent(createMouseEvent('mousemove', 100));

  expect(onResize).toHaveBeenCalledWith(0);
});
