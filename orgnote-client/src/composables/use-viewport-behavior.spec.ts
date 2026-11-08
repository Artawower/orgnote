import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { useViewportBehavior, useKeyboardState, _resetForTesting } from './use-viewport-behavior';

const originalVisualViewport = window.visualViewport;

let platformIs = {
  ios: true,
  safari: true,
  capacitor: false,
  android: false,
  desktop: false,
  electron: false,
  mobile: true,
};

vi.mock('src/utils/platform-detection', () => ({
  platform: {
    get is() {
      return platformIs;
    },
  },
  platformMatch: async (handlers: { default: () => unknown }) => handlers.default(),
}));

vi.mock('src/utils/platform-specific', () => ({
  iosPwaOnly: (fn?: (...args: unknown[]) => unknown) => {
    if (!fn) return () => {};
    return (...args: unknown[]) => {
      if (!window.navigator.standalone) return undefined;
      return fn(...args);
    };
  },
}));

vi.mock('src/utils/android-keyboard-hide', () => ({
  isKeyboardHideWindowActive: vi.fn(() => false),
}));

import { isKeyboardHideWindowActive } from 'src/utils/android-keyboard-hide';

const createTouchEvent = (
  type: 'touchstart' | 'touchmove' | 'touchend',
  x: number,
  y: number,
  target?: Element,
): TouchEvent => {
  const touch = { clientX: x, clientY: y } as Touch;
  const touchList = {
    0: touch,
    length: 1,
    item: () => touch,
    [Symbol.iterator]: function* () {
      yield touch;
    },
  } as unknown as TouchList;

  const event = {
    type,
    touches: type === 'touchend' ? ({ length: 0 } as TouchList) : touchList,
    changedTouches: touchList,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    bubbles: true,
    cancelable: true,
    composedPath: () => (target ? [target] : []),
  } as unknown as TouchEvent;

  if (target) {
    Object.defineProperty(event, 'target', { value: target, configurable: true });
  }

  return event;
};

const createTestComponent = () =>
  defineComponent({
    setup() {
      useViewportBehavior();
      return () => null;
    },
  });

const waitForAnimationFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
};

beforeEach(() => {
  platformIs = {
    ios: true,
    safari: true,
    capacitor: false,
    android: false,
    desktop: false,
    electron: false,
    mobile: true,
  };
  _resetForTesting();
  document.documentElement.style.cssText = '';
  document.body.style.cssText = '';
  document.body.classList.remove('keyboard-opened');

  Object.defineProperty(window, 'visualViewport', {
    value: {
      height: 800,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true });
  Object.defineProperty(window.navigator, 'standalone', {
    value: false,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', {
    value: originalVisualViewport,
    configurable: true,
  });
  vi.restoreAllMocks();
});

test('useViewportBehavior refreshes desktop screen height on window resize', async () => {
  platformIs = {
    ios: false,
    safari: false,
    capacitor: false,
    android: false,
    desktop: true,
    electron: true,
    mobile: false,
  };
  const viewport = {
    height: 300,
    offsetTop: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, 'visualViewport', {
    value: viewport,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true, writable: true });

  const wrapper = mount(createTestComponent());

  expect(viewport.addEventListener).not.toHaveBeenCalledWith('resize', expect.any(Function));
  expect(document.documentElement.style.getPropertyValue('--screen-height')).toBe('300px');

  viewport.height = 900;
  window.dispatchEvent(new Event('resize'));
  await waitForAnimationFrame();

  expect(document.documentElement.style.getPropertyValue('--screen-height')).toBe('900px');
  expect(useKeyboardState().keyboardOpened.value).toBe(false);

  wrapper.unmount();
});

test('useViewportBehavior should not prevent default for horizontal-only scroll target', () => {
  const scrollable = document.createElement('div');
  scrollable.style.overflowX = 'auto';
  scrollable.style.overflowY = 'hidden';
  Object.defineProperty(scrollable, 'scrollWidth', { value: 500, configurable: true });
  Object.defineProperty(scrollable, 'clientWidth', { value: 300, configurable: true });
  Object.defineProperty(scrollable, 'scrollHeight', { value: 100, configurable: true });
  Object.defineProperty(scrollable, 'clientHeight', { value: 100, configurable: true });
  document.body.appendChild(scrollable);

  const wrapper = mount(createTestComponent());

  document.dispatchEvent(createTouchEvent('touchstart', 100, 100, scrollable));
  const moveEvent = createTouchEvent('touchmove', 100, 150, scrollable);
  document.dispatchEvent(moveEvent);

  expect(moveEvent.preventDefault).not.toHaveBeenCalled();

  document.body.removeChild(scrollable);
  wrapper.unmount();
});

test('useViewportBehavior should prevent default at vertical boundary', () => {
  const scrollable = document.createElement('div');
  scrollable.style.overflowY = 'auto';
  scrollable.style.overflowX = 'hidden';
  Object.defineProperty(scrollable, 'scrollHeight', { value: 500, configurable: true });
  Object.defineProperty(scrollable, 'clientHeight', { value: 300, configurable: true });
  Object.defineProperty(scrollable, 'scrollTop', { value: 0, configurable: true });
  document.body.appendChild(scrollable);

  const wrapper = mount(createTestComponent());

  document.dispatchEvent(createTouchEvent('touchstart', 100, 100, scrollable));
  const moveEvent = createTouchEvent('touchmove', 100, 150, scrollable);
  document.dispatchEvent(moveEvent);

  expect(moveEvent.preventDefault).toHaveBeenCalled();

  document.body.removeChild(scrollable);
  wrapper.unmount();
});

test('useViewportBehavior skips keyboard-open state update during hide window', () => {
  vi.mocked(isKeyboardHideWindowActive).mockReturnValueOnce(true);

  Object.defineProperty(window, 'visualViewport', {
    value: { height: 300, offsetTop: 0, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    configurable: true,
  });

  const wrapper = mount(createTestComponent());

  const { keyboardOpened } = useKeyboardState();
  expect(keyboardOpened.value).toBe(false);

  wrapper.unmount();
  document.body.classList.remove('keyboard-opened');
});

test('useViewportBehavior locks viewport height for ios standalone pwa keyboard state', async () => {
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();

  Object.defineProperty(window.navigator, 'standalone', {
    value: true,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(window, 'visualViewport', {
    value: { height: 300, offsetTop: 0, addEventListener, removeEventListener },
    configurable: true,
  });

  const wrapper = mount(createTestComponent());

  await Promise.resolve();

  expect(document.documentElement.style.height).toBe('300px');
  expect(document.documentElement.style.maxHeight).toBe('300px');
  expect(document.body.style.height).toBe('300px');
  expect(document.body.style.maxHeight).toBe('300px');
  expect(addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));

  wrapper.unmount();

  expect(removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
});

test('useViewportBehavior corrects stuck viewport offset after keyboard closes', async () => {
  const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});

  Object.defineProperty(window.navigator, 'standalone', {
    value: true,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(window, 'visualViewport', {
    value: { height: 800, offsetTop: 24, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    configurable: true,
  });

  const wrapper = mount(createTestComponent());

  await Promise.resolve();

  expect(scrollBySpy).toHaveBeenNthCalledWith(1, 0, -1);
  expect(scrollBySpy).toHaveBeenNthCalledWith(2, 0, 1);

  wrapper.unmount();
});

test('useViewportBehavior does not correct stuck viewport offset when keyboard is open', () => {
  const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});

  Object.defineProperty(window.navigator, 'standalone', {
    value: true,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(window, 'visualViewport', {
    value: { height: 300, offsetTop: 24, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    configurable: true,
  });

  const wrapper = mount(createTestComponent());

  expect(scrollBySpy).not.toHaveBeenCalled();

  const { keyboardOpened } = useKeyboardState();
  expect(keyboardOpened.value).toBe(true);

  wrapper.unmount();
});

test('useViewportBehavior does not correct stuck viewport offset outside standalone pwa', () => {
  const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();

  Object.defineProperty(window, 'visualViewport', {
    value: { height: 800, offsetTop: 24, addEventListener, removeEventListener },
    configurable: true,
  });

  const wrapper = mount(createTestComponent());

  expect(scrollBySpy).not.toHaveBeenCalled();
  expect(addEventListener).not.toHaveBeenCalledWith('scroll', expect.any(Function));

  wrapper.unmount();

  expect(removeEventListener).not.toHaveBeenCalledWith('scroll', expect.any(Function));
});
