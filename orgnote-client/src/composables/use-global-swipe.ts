import { ref, onMounted, onUnmounted } from 'vue';
import type { PanEventDetails } from './use-drawer-gesture';
import { isNullable } from 'orgnote-api/utils';

const SWIPE_THRESHOLD = 10;

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  isHorizontalSwipe: boolean | null;
}

interface TouchDelta {
  x: number;
  y: number;
}

interface UseGlobalSwipeOptions {
  onPan: (details: PanEventDetails) => void;
  enabled: () => boolean;
  onCancel?: () => void;
}

const hasWindowSelection = (): boolean => {
  const selection = window.getSelection();
  return Boolean(selection && selection.toString().length > 0);
};

const hasInputSelection = (): boolean => {
  const activeElement = document.activeElement;
  const isTextInput =
    activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement;

  if (!isTextInput) return false;

  return activeElement.selectionStart !== activeElement.selectionEnd;
};

const hasTextSelection = (): boolean => hasWindowSelection() || hasInputSelection();

const isHorizontallyScrollable = (element: Element): boolean => {
  const style = window.getComputedStyle(element);
  const overflowX = style.overflowX;
  const canScroll = overflowX === 'auto' || overflowX === 'scroll';
  const hasScrollableContent = element.scrollWidth > element.clientWidth;
  return canScroll && hasScrollableContent;
};

const isInsideHorizontalScroll = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;

  let current: Element | null = target;
  while (current) {
    if (isHorizontallyScrollable(current)) return true;
    current = current.parentElement;
  }
  return false;
};

const getFirstTouch = (evt: TouchEvent): Touch | undefined => evt.touches[0];

const getChangedTouch = (evt: TouchEvent): Touch | undefined => evt.changedTouches[0];

const calculateDelta = (touch: Touch, state: SwipeState): TouchDelta => ({
  x: touch.clientX - state.startX,
  y: touch.clientY - state.startY,
});

const isAboveThreshold = (delta: TouchDelta): boolean =>
  Math.abs(delta.x) >= SWIPE_THRESHOLD || Math.abs(delta.y) >= SWIPE_THRESHOLD;

const isHorizontalMovement = (delta: TouchDelta): boolean =>
  Math.abs(delta.x) > Math.abs(delta.y);

const createPanDetails = (
  evt: TouchEvent,
  offset: TouchDelta,
  isFirst: boolean,
  isFinal: boolean,
  startTime: number,
): PanEventDetails => ({
  evt,
  touch: true,
  isFirst,
  isFinal,
  direction: offset.x > 0 ? 'right' : 'left',
  offset,
  duration: Date.now() - startTime,
});

const createInitialState = (touch: Touch): SwipeState => ({
  startX: touch.clientX,
  startY: touch.clientY,
  startTime: Date.now(),
  isHorizontalSwipe: null,
});

export const useGlobalSwipe = (options: UseGlobalSwipeOptions) => {
  const { onPan, enabled, onCancel } = options;
  const swipeState = ref<SwipeState | null>(null);

  const reset = (): void => {
    if (!swipeState.value) return;
    swipeState.value = null;
    onCancel?.();
  };

  const handleTouchStart = (evt: TouchEvent) => {
    if (!enabled()) return;
    if (hasTextSelection()) return;
    if (isInsideHorizontalScroll(evt.target)) return;

    const touch = getFirstTouch(evt);
    if (!touch) return;

    swipeState.value = createInitialState(touch);
  };

  const handleSwipeDirectionDetection = (
    evt: TouchEvent,
    state: SwipeState,
    delta: TouchDelta,
  ): void => {
    if (!isAboveThreshold(delta)) return;

    state.isHorizontalSwipe = isHorizontalMovement(delta);

    if (!state.isHorizontalSwipe) return;

    onPan(createPanDetails(evt, delta, true, false, state.startTime));
  };

  const handleContinuousSwipe = (evt: TouchEvent, state: SwipeState, delta: TouchDelta): void => {
    if (!state.isHorizontalSwipe) return;

    onPan(createPanDetails(evt, delta, false, false, state.startTime));
  };

  const handleTouchMove = (evt: TouchEvent) => {
    const state = swipeState.value;
    if (!state) return;

    const touch = getFirstTouch(evt);
    if (!touch) return;

    const delta = calculateDelta(touch, state);

    if (isNullable(state.isHorizontalSwipe)) {
      handleSwipeDirectionDetection(evt, state, delta);
      return;
    }

    handleContinuousSwipe(evt, state, delta);
  };

  const handleTouchEnd = (evt: TouchEvent) => {
    const state = swipeState.value;
    if (!state) return;

    if (state.isHorizontalSwipe) {
      const touch = getChangedTouch(evt);
      const delta = touch ? calculateDelta(touch, state) : { x: 0, y: 0 };

      onPan(createPanDetails(evt, delta, false, true, state.startTime));
    }

    swipeState.value = null;
  };

  const handleTouchCancel = (): void => {
    reset();
  };

  onMounted(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });
  });

  onUnmounted(() => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchCancel);
  });

  return {
    reset,
  };
};
