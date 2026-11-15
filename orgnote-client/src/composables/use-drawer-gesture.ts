import { ref } from 'vue';
import type { Ref } from 'vue';

const VELOCITY_THRESHOLD = 0.3;
const CLOSE_THRESHOLD_RATIO = 0.5;

type DrawerSide = 'left' | 'right';

interface DrawerGestureOptions {
  drawerWidth: number;
  opened: Ref<boolean>;
  side: DrawerSide;
  onOpen: () => void;
  onClose: () => void;
}

export interface PanEventDetails {
  evt?: Event;
  touch?: boolean;
  mouse?: boolean;
  position?: { top?: number; left?: number };
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  offset?: { x?: number; y?: number };
  isFirst?: boolean;
  isFinal?: boolean;
}

interface ParsedPanDetails {
  isFirst: boolean;
  isFinal: boolean;
  offset: { x: number; y: number };
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

const parsePanDetails = (details: PanEventDetails): ParsedPanDetails => ({
  isFirst: details.isFirst ?? false,
  isFinal: details.isFinal ?? false,
  offset: { x: details.offset?.x ?? 0, y: details.offset?.y ?? 0 },
  duration: details.duration ?? 1,
  direction: details.direction,
});

const shouldOpenDrawer = (
  offset: { x: number },
  duration: number,
  direction: string | undefined,
  openDirection: string,
  currentProgress: number,
): boolean => {
  const velocity = Math.abs(offset.x) / duration;
  const isFastSwipe = velocity > VELOCITY_THRESHOLD;

  if (isFastSwipe) {
    return direction === openDirection;
  }
  return currentProgress > CLOSE_THRESHOLD_RATIO;
};

export const useDrawerGesture = (options: DrawerGestureOptions) => {
  const { drawerWidth, opened, side, onOpen, onClose } = options;

  const progress = ref(opened.value ? 1 : 0);
  const isDragging = ref(false);
  const canDrag = ref(false);
  const dragStartedWithOpenDrawer = ref(false);

  const openDirection = side === 'left' ? 'right' : 'left';

  const handleDragStart = (direction: string | undefined): void => {
    const isDrawerOpen = opened.value;
    const isSwipingToOpen = direction === openDirection;

    dragStartedWithOpenDrawer.value = isDrawerOpen;
    canDrag.value = isDrawerOpen || isSwipingToOpen;

    if (!canDrag.value) {
      return;
    }

    isDragging.value = true;
    progress.value = isDrawerOpen ? 1 : 0;
  };

  const handleDragEnd = (offset: { x: number }, duration: number, direction?: string): void => {
    isDragging.value = false;

    const shouldOpen = shouldOpenDrawer(offset, duration, direction, openDirection, progress.value);
    const callback = shouldOpen ? onOpen : onClose;
    callback();

    canDrag.value = false;
    dragStartedWithOpenDrawer.value = false;
  };

  const handleDragMove = (offset: { x: number }): void => {
    const basePosition = dragStartedWithOpenDrawer.value ? drawerWidth : 0;
    const offsetX = side === 'left' ? offset.x : -offset.x;
    const newPosition = Math.max(0, Math.min(drawerWidth, basePosition + offsetX));
    progress.value = newPosition / drawerWidth;
  };

  const reset = (): void => {
    progress.value = opened.value ? 1 : 0;
    isDragging.value = false;
    canDrag.value = false;
    dragStartedWithOpenDrawer.value = false;
  };

  const handlePan = (details: PanEventDetails): void => {
    const { isFirst, isFinal, offset, duration, direction } = parsePanDetails(details);

    if (isFirst) {
      handleDragStart(direction);
      return;
    }

    if (!canDrag.value) {
      return;
    }

    if (isFinal) {
      handleDragEnd(offset, duration, direction);
      return;
    }

    handleDragMove(offset);
  };

  return {
    progress,
    isDragging,
    handlePan,
    reset,
  };
};
