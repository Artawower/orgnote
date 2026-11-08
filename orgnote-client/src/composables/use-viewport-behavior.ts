import { ref, onMounted, onUnmounted, readonly, type Ref } from 'vue';
import { platform, platformMatch } from 'src/utils/platform-detection';
import { to } from 'orgnote-api/utils';
import { isKeyboardHideWindowActive } from 'src/utils/android-keyboard-hide';
import { iosPwaOnly } from 'src/utils/platform-specific';
interface ViewportInfo {
  viewportHeight: number;
  keyboardOpened: boolean;
}

type ViewportCallback = (info: ViewportInfo) => void;

const KEYBOARD_HEIGHT_THRESHOLD = 80;
const VH_MULTIPLIER = 0.01;
const KEYBOARD_OPEN_RATIO_THRESHOLD = 0.6;
const VIEWPORT_STABLE_DELTA = 1;
const REQUIRED_STABLE_FRAMES = 2;

const shouldUseDynamicViewportHeight = (): boolean => platform.is.desktop || platform.is.electron;

const globalKeyboardOpened = ref(false);
const globalKeyboardHeight = ref(0);
const globalViewportHeight = ref(0);
let initialViewportHeight = 0;

export function useKeyboardState(): {
  keyboardOpened: Readonly<Ref<boolean>>;
  keyboardHeight: Readonly<Ref<number>>;
  viewportHeight: Readonly<Ref<number>>;
} {
  return {
    keyboardOpened: readonly(globalKeyboardOpened),
    keyboardHeight: readonly(globalKeyboardHeight),
    viewportHeight: readonly(globalViewportHeight),
  };
}

const setKeyboardState = (opened: boolean, height: number): void => {
  if (opened) resetOffsetCorrectionFlag();
  globalKeyboardOpened.value = opened;
  globalKeyboardHeight.value = height;
  document.body.classList.toggle('keyboard-opened', opened);
  document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
};

const captureInitialViewportHeight = (force = false): void => {
  if (initialViewportHeight === 0 || force) {
    initialViewportHeight = window.innerHeight;
    document.documentElement.style.setProperty(
      '--initial-viewport-height',
      `${initialViewportHeight}px`,
    );
  }
};

const updateCssVariables = (screenHeight: number, viewportOffsetTop: number): void => {
  const singleVh = screenHeight * VH_MULTIPLIER;
  document.documentElement.style.setProperty('--vh', `${singleVh}px`);
  document.documentElement.style.setProperty('--screen-height', `${screenHeight}px`);
  document.documentElement.style.setProperty('--viewport-offset-top', `${viewportOffsetTop}px`);
};

const lockIOSStandaloneViewport = iosPwaOnly((screenHeight: number): void => {
  const heightValue = `${screenHeight}px`;
  [document.documentElement, document.body].forEach((element) => {
    element.style.setProperty('height', heightValue, 'important');
    element.style.setProperty('max-height', heightValue, 'important');
  });
});

const getScrollability = (element: HTMLElement): { vertical: boolean; horizontal: boolean } => {
  const { overflowY, overflowX } = getComputedStyle(element);
  const vertical =
    (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight;
  const horizontal =
    (overflowX === 'auto' || overflowX === 'scroll') && element.scrollWidth > element.clientWidth;

  return { vertical, horizontal };
};

const findScrollableAncestor = (element: Element | null): HTMLElement | null => {
  if (!element || element === document.documentElement) return null;

  if (element instanceof HTMLElement) {
    const { vertical, horizontal } = getScrollability(element);
    if (vertical || horizontal) {
      return element;
    }
  }

  return findScrollableAncestor(element.parentElement);
};

const createTouchScrollPreventer = () => {
  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  };

  const preventTouchScroll = (e: TouchEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const scrollableElement = findScrollableAncestor(target);
    if (!scrollableElement) {
      e.preventDefault();
      return;
    }

    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touchStartX - touch.clientX;
    const deltaY = touchStartY - touch.clientY;
    const { vertical, horizontal } = getScrollability(scrollableElement);

    if (horizontal && Math.abs(deltaX) > Math.abs(deltaY)) return;
    if (!vertical) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
    const isAtTop = scrollTop <= 0 && deltaY < 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight && deltaY > 0;

    if (isAtTop || isAtBottom) {
      e.preventDefault();
    }
  };

  return { handleTouchStart, preventTouchScroll };
};

let hasCorrectedOffset = false;

const resetOffsetCorrectionFlag = (): void => {
  hasCorrectedOffset = false;
};

export function _resetForTesting(): void {
  globalKeyboardOpened.value = false;
  globalKeyboardHeight.value = 0;
  globalViewportHeight.value = 0;
  initialViewportHeight = 0;
  hasCorrectedOffset = false;
  document.documentElement.style.removeProperty('height');
  document.documentElement.style.removeProperty('max-height');
  document.body.style.removeProperty('height');
  document.body.style.removeProperty('max-height');
  document.body.classList.remove('keyboard-opened');
  document.documentElement.style.removeProperty('--keyboard-height');
  document.documentElement.style.removeProperty('--initial-viewport-height');
  document.documentElement.style.removeProperty('--vh');
  document.documentElement.style.removeProperty('--screen-height');
  document.documentElement.style.removeProperty('--viewport-offset-top');
}

const correctStuckViewportOffset = iosPwaOnly((): void => {
  const currentOffsetTop = window.visualViewport?.offsetTop ?? 0;
  if (hasCorrectedOffset || globalKeyboardOpened.value || currentOffsetTop <= 0) return;

  hasCorrectedOffset = true;
  window.scrollBy(0, -1);
  window.scrollBy(0, 1);
});

const createViewportMeasurer = (viewportHeight: Ref<number>, cb?: ViewportCallback) => {
  return () => {
    const screenHeight = window.visualViewport?.height ?? window.innerHeight;
    const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
    viewportHeight.value = screenHeight;
    globalViewportHeight.value = screenHeight;

    if (shouldUseDynamicViewportHeight()) {
      setKeyboardState(false, 0);
      updateCssVariables(screenHeight, viewportOffsetTop);
      cb?.({ viewportHeight: screenHeight, keyboardOpened: false });
      return;
    }

    if (!platform.is.capacitor || platform.is.android) {
      const baseHeight = initialViewportHeight || window.innerHeight;
      const height = Math.max(0, baseHeight - screenHeight);
      const opened =
        height > KEYBOARD_HEIGHT_THRESHOLD ||
        screenHeight / baseHeight <= KEYBOARD_OPEN_RATIO_THRESHOLD;
      const effectiveOpened = opened && !isKeyboardHideWindowActive();
      setKeyboardState(effectiveOpened, effectiveOpened ? height : 0);

      const effectiveHeight = effectiveOpened ? screenHeight : baseHeight;
      updateCssVariables(effectiveHeight, viewportOffsetTop);
      lockIOSStandaloneViewport(effectiveHeight);
      correctStuckViewportOffset();

      if (!platform.is.ios) return;
      if (effectiveOpened) {
        window.scrollTo(0, 0);
      }
    }

    cb?.({ viewportHeight: screenHeight, keyboardOpened: globalKeyboardOpened.value });
  };
};

const createScheduler = (measureFn: () => void) => {
  let rafId = 0;
  let stableFrames = 0;
  let lastHeight = -1;
  let lastOffsetTop = -1;

  const hasStableViewport = (): boolean => {
    const height = window.visualViewport?.height ?? window.innerHeight;
    const offsetTop = window.visualViewport?.offsetTop ?? 0;
    const isStable =
      Math.abs(height - lastHeight) <= VIEWPORT_STABLE_DELTA &&
      Math.abs(offsetTop - lastOffsetTop) <= VIEWPORT_STABLE_DELTA;

    lastHeight = height;
    lastOffsetTop = offsetTop;
    stableFrames = isStable ? stableFrames + 1 : 0;

    return stableFrames >= REQUIRED_STABLE_FRAMES;
  };

  const runMeasure = () => {
    rafId = 0;
    stableFrames = 0;
    measureFn();
  };

  const waitForStableViewport = () => {
    if (hasStableViewport()) {
      runMeasure();
      return;
    }

    rafId = requestAnimationFrame(waitForStableViewport);
  };

  const schedule = () => {
    if (rafId) return;
    if (!platform.is.ios) {
      rafId = requestAnimationFrame(runMeasure);
      return;
    }

    stableFrames = 0;
    lastHeight = -1;
    lastOffsetTop = -1;
    rafId = requestAnimationFrame(waitForStableViewport);
  };

  const cancel = () => {
    cancelAnimationFrame(rafId);
    rafId = 0;
    stableFrames = 0;
  };

  return { schedule, cancel };
};

const addViewportListeners = (schedule: () => void): void => {
  if (shouldUseDynamicViewportHeight()) {
    window.addEventListener('resize', schedule);
    return;
  }

  window.visualViewport?.addEventListener('resize', schedule);
  iosPwaOnly(() => {
    window.visualViewport?.addEventListener('scroll', schedule);
  })();
};

const removeViewportListeners = (schedule: () => void): void => {
  if (shouldUseDynamicViewportHeight()) {
    window.removeEventListener('resize', schedule);
    return;
  }

  window.visualViewport?.removeEventListener('resize', schedule);
  iosPwaOnly(() => {
    window.visualViewport?.removeEventListener('scroll', schedule);
  })();
};

const setupCapacitorKeyboardListeners = async () => {
  return platformMatch({
    android: () => ({ cleanup: () => {} }),
    default: async () => {
      const keyboardModule = await to(() => import('@capacitor/keyboard'))();
      if (keyboardModule.isErr()) return { cleanup: () => {} };

      const { Keyboard } = keyboardModule.value;
      const showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
        setKeyboardState(true, info.keyboardHeight);
      });
      const hideListener = await Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardState(false, 0);
      });

      return {
        cleanup: () => {
          showListener.remove();
          hideListener.remove();
        },
      };
    },
  });
};

const setupIOSSafariScrollFix = () => {
  const { handleTouchStart, preventTouchScroll } = createTouchScrollPreventer();

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', preventTouchScroll, { passive: false });

  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', preventTouchScroll);
  };
};

export function useViewportBehavior(cb?: ViewportCallback) {
  const isIOSSafari = platform.is.ios && platform.is.safari;
  const viewportHeight = ref<number>(0);

  const measure = createViewportMeasurer(viewportHeight, cb);
  const { schedule, cancel: cancelScheduler } = createScheduler(measure);

  let capacitorCleanup: (() => void) | undefined;
  let safariCleanup: (() => void) | undefined;

  const handleOrientationChange = () => {
    setTimeout(() => {
      captureInitialViewportHeight(true);
      schedule();
    }, 100);
  };

  onMounted(() => {
    captureInitialViewportHeight();
    measure();
    addViewportListeners(schedule);
    window.addEventListener('orientationchange', handleOrientationChange);

    platformMatch({
      capacitor: async () => {
        const result = await setupCapacitorKeyboardListeners();
        capacitorCleanup = result.cleanup;
      },
      default: () => {},
    });

    if (isIOSSafari) {
      safariCleanup = setupIOSSafariScrollFix();
    }
  });

  onUnmounted(() => {
    removeViewportListeners(schedule);
    window.removeEventListener('orientationchange', handleOrientationChange);
    safariCleanup?.();
    capacitorCleanup?.();
    cancelScheduler();
  });

  return {
    viewportHeight,
    keyboardOpened: readonly(globalKeyboardOpened),
    keyboardHeight: readonly(globalKeyboardHeight),
  };
}
