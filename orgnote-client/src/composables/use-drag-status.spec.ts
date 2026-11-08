import { test, expect } from 'vitest';
import { useDragStatus } from './use-drag-status';

const createDragEvent = (type: string) => {
  return new DragEvent(type, {
    cancelable: true,
    bubbles: true,
  });
};

test('useDragStatus should have initial state false', () => {
  const { dragInProgress } = useDragStatus();
  expect(dragInProgress.value).toBe(false);
});

test('useDragStatus should set dragInProgress to true on drag enter', () => {
  const { dragInProgress, onDragEnter } = useDragStatus();
  const event = createDragEvent('dragenter');
  onDragEnter(event);
  expect(dragInProgress.value).toBe(true);
});

test('useDragStatus should keep dragInProgress true on subsequent drag enters', () => {
  const { dragInProgress, onDragEnter } = useDragStatus();
  onDragEnter(createDragEvent('dragenter'));
  onDragEnter(createDragEvent('dragenter'));
  expect(dragInProgress.value).toBe(true);
});

test('useDragStatus should set dragInProgress to false only when drag counter is 0', () => {
  const { dragInProgress, onDragEnter, onDragLeave } = useDragStatus();
  onDragEnter(createDragEvent('dragenter')); // counter 1
  onDragEnter(createDragEvent('dragenter')); // counter 2

  onDragLeave(createDragEvent('dragleave')); // counter 1
  expect(dragInProgress.value).toBe(true);

  onDragLeave(createDragEvent('dragleave')); // counter 0
  expect(dragInProgress.value).toBe(false);
});

test('useDragStatus should reset state', () => {
  const { dragInProgress, onDragEnter, reset } = useDragStatus();
  onDragEnter(createDragEvent('dragenter'));
  expect(dragInProgress.value).toBe(true);
  reset();
  expect(dragInProgress.value).toBe(false);
});

test('useDragStatus should prevent default on events', () => {
  const { onDragEnter, onDragLeave, onDragOver } = useDragStatus();

  let prevented = false;
  const mockEvent = {
      preventDefault: () => { prevented = true; },
      dataTransfer: {}
  } as unknown as DragEvent;

  onDragEnter(mockEvent);
  expect(prevented).toBe(true);

  prevented = false;
  onDragLeave(mockEvent);
  expect(prevented).toBe(true);

  prevented = false;
  onDragOver(mockEvent);
  expect(prevented).toBe(true);
});
