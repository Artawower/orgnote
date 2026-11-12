import type { Directive } from 'vue';

const SWIPE_THRESHOLD = 40;
const HANDLER_KEY = Symbol('swipeStopHandlers');

interface SwipeStopElement extends HTMLElement {
  [HANDLER_KEY]?: () => void;
}

const dispatchSwipe = (el: HTMLElement, direction: 'left' | 'right'): void => {
  el.dispatchEvent(new CustomEvent(`swipe-${direction}`, { bubbles: false }));
};

export const vSwipeStop: Directive<SwipeStopElement> = {
  mounted: (el) => {
    let startX = 0;

    const onTouchStart = (e: TouchEvent): void => {
      e.stopPropagation();
      startX = e.touches[0]?.clientX ?? 0;
    };

    const onTouchMove = (e: TouchEvent): void => {
      e.stopPropagation();
    };

    const onTouchEnd = (e: TouchEvent): void => {
      e.stopPropagation();
      const endX = e.changedTouches[0]?.clientX ?? 0;
      const delta = endX - startX;
      if (Math.abs(delta) < SWIPE_THRESHOLD) return;
      dispatchSwipe(el, delta < 0 ? 'left' : 'right');
    };

    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove);
    el.addEventListener('touchend', onTouchEnd);

    el[HANDLER_KEY] = () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  },
  unmounted: (el) => {
    el[HANDLER_KEY]?.();
    delete el[HANDLER_KEY];
  },
};
