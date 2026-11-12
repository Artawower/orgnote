import { test, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useDrawerGesture, type PanEventDetails } from './use-drawer-gesture';

const createGesture = (options?: {
  drawerWidth?: number;
  opened?: boolean;
  side?: 'left' | 'right';
}) => {
  const onOpen = vi.fn();
  const onClose = vi.fn();
  const opened = ref(options?.opened ?? false);

  const gesture = useDrawerGesture({
    drawerWidth: options?.drawerWidth ?? 300,
    opened,
    side: options?.side ?? 'left',
    onOpen,
    onClose,
  });

  return { gesture, onOpen, onClose, opened };
};

const createPanEvent = (overrides?: Partial<PanEventDetails>): PanEventDetails => ({
  isFirst: false,
  isFinal: false,
  direction: 'right',
  offset: { x: 0, y: 0 },
  duration: 100,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('useDrawerGesture should initialize with progress 0', () => {
  const { gesture } = createGesture();
  expect(gesture.progress.value).toBe(0);
});

test('useDrawerGesture should initialize with isDragging false', () => {
  const { gesture } = createGesture();
  expect(gesture.isDragging.value).toBe(false);
});

test('useDrawerGesture should start dragging on first pan event when swiping to open direction (left drawer)', () => {
  const { gesture } = createGesture({ side: 'left' });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));

  expect(gesture.isDragging.value).toBe(true);
});

test('useDrawerGesture should start dragging on first pan event when swiping to open direction (right drawer)', () => {
  const { gesture } = createGesture({ side: 'right' });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'left' }));

  expect(gesture.isDragging.value).toBe(true);
});

test('useDrawerGesture should not start dragging when swiping wrong direction (left drawer closed)', () => {
  const { gesture } = createGesture({ side: 'left', opened: false });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'left' }));

  expect(gesture.isDragging.value).toBe(false);
});

test('useDrawerGesture should not start dragging when swiping wrong direction (right drawer closed)', () => {
  const { gesture } = createGesture({ side: 'right', opened: false });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));

  expect(gesture.isDragging.value).toBe(false);
});

test('useDrawerGesture should start dragging when drawer is open regardless of direction', () => {
  const { gesture } = createGesture({ side: 'left', opened: true });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'left' }));

  expect(gesture.isDragging.value).toBe(true);
});

test('useDrawerGesture should set progress to 1 when starting drag with open drawer', () => {
  const { gesture } = createGesture({ side: 'left', opened: true });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'left' }));

  expect(gesture.progress.value).toBe(1);
});

test('useDrawerGesture should set progress to 0 when starting drag with closed drawer', () => {
  const { gesture } = createGesture({ side: 'left', opened: false });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));

  expect(gesture.progress.value).toBe(0);
});

test('useDrawerGesture should update progress during drag (left drawer)', () => {
  const { gesture } = createGesture({ side: 'left', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(createPanEvent({ offset: { x: 150, y: 0 } }));

  expect(gesture.progress.value).toBe(0.5);
});

test('useDrawerGesture should update progress during drag (right drawer)', () => {
  const { gesture } = createGesture({ side: 'right', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'left' }));
  gesture.handlePan(createPanEvent({ offset: { x: -150, y: 0 } }));

  expect(gesture.progress.value).toBe(0.5);
});

test('useDrawerGesture should clamp progress to minimum 0', () => {
  const { gesture } = createGesture({ side: 'left', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(createPanEvent({ offset: { x: -100, y: 0 } }));

  expect(gesture.progress.value).toBe(0);
});

test('useDrawerGesture should clamp progress to maximum 1', () => {
  const { gesture } = createGesture({ side: 'left', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(createPanEvent({ offset: { x: 500, y: 0 } }));

  expect(gesture.progress.value).toBe(1);
});

test('useDrawerGesture should call onOpen when drag ends with progress > 0.5', () => {
  const { gesture, onOpen, onClose } = createGesture({ side: 'left', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(createPanEvent({ offset: { x: 200, y: 0 } }));
  gesture.handlePan(createPanEvent({ isFinal: true, offset: { x: 10, y: 0 }, duration: 1000 }));

  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});

test('useDrawerGesture should call onClose when drag ends with progress < 0.5', () => {
  const { gesture, onOpen, onClose } = createGesture({ side: 'left', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(createPanEvent({ offset: { x: 100, y: 0 } }));
  gesture.handlePan(createPanEvent({ isFinal: true, offset: { x: 10, y: 0 }, duration: 1000 }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onOpen).not.toHaveBeenCalled();
});

test('useDrawerGesture should call onOpen on fast swipe in open direction', () => {
  const { gesture, onOpen, onClose } = createGesture({ side: 'left', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(
    createPanEvent({
      isFinal: true,
      direction: 'right',
      offset: { x: 100, y: 0 },
      duration: 100,
    }),
  );

  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});

test('useDrawerGesture should call onClose on fast swipe in close direction', () => {
  const { gesture, onOpen, onClose } = createGesture({ side: 'left', drawerWidth: 300, opened: true });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'left' }));
  gesture.handlePan(
    createPanEvent({
      isFinal: true,
      direction: 'left',
      offset: { x: -100, y: 0 },
      duration: 100,
    }),
  );

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onOpen).not.toHaveBeenCalled();
});

test('useDrawerGesture should set isDragging to false after final event', () => {
  const { gesture } = createGesture({ side: 'left' });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  expect(gesture.isDragging.value).toBe(true);

  gesture.handlePan(createPanEvent({ isFinal: true, offset: { x: 10, y: 0 }, duration: 1000 }));
  expect(gesture.isDragging.value).toBe(false);
});

test('useDrawerGesture should ignore pan events when canDrag is false', () => {
  const { gesture, onOpen, onClose } = createGesture({ side: 'left', opened: false });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'left' }));
  gesture.handlePan(createPanEvent({ offset: { x: 200, y: 0 } }));
  gesture.handlePan(createPanEvent({ isFinal: true }));

  expect(gesture.isDragging.value).toBe(false);
  expect(onOpen).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test('useDrawerGesture should handle drag from open drawer (left)', () => {
  const { gesture } = createGesture({ side: 'left', drawerWidth: 300, opened: true });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'left' }));
  gesture.handlePan(createPanEvent({ offset: { x: -150, y: 0 } }));

  expect(gesture.progress.value).toBe(0.5);
});

test('useDrawerGesture should handle drag from open drawer (right)', () => {
  const { gesture } = createGesture({ side: 'right', drawerWidth: 300, opened: true });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(createPanEvent({ offset: { x: 150, y: 0 } }));

  expect(gesture.progress.value).toBe(0.5);
});

test('useDrawerGesture should handle multiple drag sessions', () => {
  const { gesture, onOpen, onClose } = createGesture({ side: 'left', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(createPanEvent({ offset: { x: 200, y: 0 } }));
  gesture.handlePan(createPanEvent({ isFinal: true, offset: { x: 10, y: 0 }, duration: 1000 }));

  expect(onOpen).toHaveBeenCalledTimes(1);

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(createPanEvent({ offset: { x: 50, y: 0 } }));
  gesture.handlePan(createPanEvent({ isFinal: true, offset: { x: 10, y: 0 }, duration: 1000 }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test('useDrawerGesture should handle missing offset values', () => {
  const { gesture } = createGesture({ side: 'left', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan({ direction: 'right' });

  expect(gesture.progress.value).toBe(0);
});

test('useDrawerGesture should handle missing offset and duration values', () => {
  const { gesture, onClose } = createGesture({ side: 'left', drawerWidth: 300 });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan({ isFinal: true });

  expect(onClose).toHaveBeenCalled();
});

test('useDrawerGesture reset should restore closed drawer state', () => {
  const { gesture } = createGesture({ side: 'left', drawerWidth: 300, opened: false });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'right' }));
  gesture.handlePan(createPanEvent({ offset: { x: 120, y: 0 } }));

  gesture.reset();

  expect(gesture.isDragging.value).toBe(false);
  expect(gesture.progress.value).toBe(0);
});

test('useDrawerGesture reset should restore open drawer state', () => {
  const { gesture } = createGesture({ side: 'left', drawerWidth: 300, opened: true });

  gesture.handlePan(createPanEvent({ isFirst: true, direction: 'left' }));
  gesture.handlePan(createPanEvent({ offset: { x: -120, y: 0 } }));

  gesture.reset();

  expect(gesture.isDragging.value).toBe(false);
  expect(gesture.progress.value).toBe(1);
});
