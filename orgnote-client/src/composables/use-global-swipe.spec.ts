import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGlobalSwipe } from './use-global-swipe';
import type { PanEventDetails } from './use-drawer-gesture';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

const createTouchEvent = (
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  x: number,
  y: number,
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

  return {
    type,
    touches: type === 'touchend' ? ({ length: 0 } as TouchList) : touchList,
    changedTouches: touchList,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    composedPath: () => [],
    bubbles: true,
    cancelable: true,
  } as unknown as TouchEvent;
};

const createTestComponent = (
  onPan: (details: PanEventDetails) => void,
  enabled: () => boolean,
  onCancel?: () => void,
) =>
  defineComponent({
    setup() {
      useGlobalSwipe({ onPan, enabled, onCancel });
      return () => null;
    },
  });

const dispatchTouchEvent = (
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  x: number,
  y: number,
) => {
  document.dispatchEvent(createTouchEvent(type, x, y));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window, 'getSelection').mockReturnValue({
    toString: () => '',
  } as Selection);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('useGlobalSwipe should not call onPan when disabled', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => false));

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 50, 100);
  dispatchTouchEvent('touchend', 50, 100);

  expect(onPan).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('useGlobalSwipe should call onPan with isFirst=true on first horizontal move', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 20, 100);

  expect(onPan).toHaveBeenCalledTimes(1);
  expect(onPan).toHaveBeenCalledWith(
    expect.objectContaining({
      isFirst: true,
      isFinal: false,
      direction: 'right',
    }),
  );
  wrapper.unmount();
});

test('useGlobalSwipe should detect left swipe direction', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 100, 100);
  dispatchTouchEvent('touchmove', 80, 100);

  expect(onPan).toHaveBeenCalledWith(
    expect.objectContaining({
      direction: 'left',
    }),
  );
  wrapper.unmount();
});

test('useGlobalSwipe should detect right swipe direction', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 20, 100);

  expect(onPan).toHaveBeenCalledWith(
    expect.objectContaining({
      direction: 'right',
    }),
  );
  wrapper.unmount();
});

test('useGlobalSwipe should not call onPan for vertical swipes', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 100, 0);
  dispatchTouchEvent('touchmove', 100, 50);
  dispatchTouchEvent('touchend', 100, 50);

  expect(onPan).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('useGlobalSwipe should not call onPan when movement is below threshold', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 100, 100);
  dispatchTouchEvent('touchmove', 105, 102);

  expect(onPan).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('useGlobalSwipe should call onPan with isFinal=true on touchend', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 20, 100);
  dispatchTouchEvent('touchend', 50, 100);

  expect(onPan).toHaveBeenCalledTimes(2);
  expect(onPan).toHaveBeenLastCalledWith(
    expect.objectContaining({
      isFirst: false,
      isFinal: true,
    }),
  );
  wrapper.unmount();
});

test('useGlobalSwipe should call onPan multiple times during continuous drag', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 20, 100);
  dispatchTouchEvent('touchmove', 40, 100);
  dispatchTouchEvent('touchmove', 60, 100);

  expect(onPan).toHaveBeenCalledTimes(3);
  expect(onPan.mock.calls[0]?.[0]).toMatchObject({ isFirst: true });
  expect(onPan.mock.calls[1]?.[0]).toMatchObject({ isFirst: false });
  expect(onPan.mock.calls[2]?.[0]).toMatchObject({ isFirst: false });
  wrapper.unmount();
});

test('useGlobalSwipe should include correct offset values', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 100, 100);
  dispatchTouchEvent('touchmove', 150, 105);

  expect(onPan).toHaveBeenCalledWith(
    expect.objectContaining({
      offset: { x: 50, y: 5 },
    }),
  );
  wrapper.unmount();
});


test('useGlobalSwipe should not call onCancel when reset happens without active swipe', () => {
  const onPan = vi.fn();
  const onCancel = vi.fn();
  let resetSwipe: () => void = () => undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        const swipe = useGlobalSwipe({ onPan, enabled: () => true, onCancel });
        resetSwipe = swipe.reset;
        return () => null;
      },
    }),
  );

  resetSwipe();

  expect(onCancel).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('useGlobalSwipe should not call onPan when there is text selection', () => {
  const onPan = vi.fn();
  vi.spyOn(window, 'getSelection').mockReturnValue({
    toString: () => 'selected text',
  } as Selection);

  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 50, 100);

  expect(onPan).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('useGlobalSwipe should not call onPan when textarea has selection', () => {
  const onPan = vi.fn();
  const textarea = document.createElement('textarea');
  textarea.value = 'some text';
  textarea.selectionStart = 0;
  textarea.selectionEnd = 4;
  document.body.appendChild(textarea);
  textarea.focus();

  vi.spyOn(window, 'getSelection').mockReturnValue({
    toString: () => '',
  } as Selection);

  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 50, 100);

  expect(onPan).not.toHaveBeenCalled();

  document.body.removeChild(textarea);
  wrapper.unmount();
});

test('useGlobalSwipe should remove event listeners on unmount', () => {
  const onPan = vi.fn();
  const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

  const wrapper = mount(createTestComponent(onPan, () => true));
  wrapper.unmount();

  expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
  expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
  expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
  expect(removeEventListenerSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function));
});

test('useGlobalSwipe should reset state after touchend', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 20, 100);
  dispatchTouchEvent('touchend', 50, 100);

  onPan.mockClear();

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 20, 100);

  expect(onPan).toHaveBeenCalledWith(
    expect.objectContaining({
      isFirst: true,
    }),
  );
  wrapper.unmount();
});

test('useGlobalSwipe should handle touchend without prior horizontal swipe', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 100, 0);
  dispatchTouchEvent('touchmove', 100, 50);
  dispatchTouchEvent('touchend', 100, 100);

  expect(onPan).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('useGlobalSwipe should include duration in pan details', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 0, 100);
  vi.advanceTimersByTime(500);
  dispatchTouchEvent('touchmove', 20, 100);

  expect(onPan).toHaveBeenCalledWith(
    expect.objectContaining({
      duration: 500,
    }),
  );
  wrapper.unmount();
});

test('useGlobalSwipe should handle touchmove without touchstart', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchmove', 50, 100);

  expect(onPan).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('useGlobalSwipe should handle touchend without touchstart', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchend', 50, 100);

  expect(onPan).not.toHaveBeenCalled();
  wrapper.unmount();
});


test('useGlobalSwipe should reset active swipe on touchcancel', () => {
  const onPan = vi.fn();
  const wrapper = mount(createTestComponent(onPan, () => true));

  dispatchTouchEvent('touchstart', 0, 100);
  dispatchTouchEvent('touchmove', 20, 100);
  dispatchTouchEvent('touchcancel', 20, 100);

  onPan.mockClear();
  dispatchTouchEvent('touchmove', 40, 100);

  expect(onPan).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('useGlobalSwipe should not call onPan when touch starts inside horizontally scrollable element', () => {
  const onPan = vi.fn();

  const scrollableContainer = document.createElement('div');
  Object.defineProperty(scrollableContainer, 'scrollWidth', { value: 500, configurable: true });
  Object.defineProperty(scrollableContainer, 'clientWidth', { value: 300, configurable: true });
  scrollableContainer.style.overflowX = 'auto';
  document.body.appendChild(scrollableContainer);

  const wrapper = mount(createTestComponent(onPan, () => true));

  const touchEvent = createTouchEvent('touchstart', 100, 100);
  Object.defineProperty(touchEvent, 'target', { value: scrollableContainer, configurable: true });
  document.dispatchEvent(touchEvent);

  dispatchTouchEvent('touchmove', 150, 100);

  expect(onPan).not.toHaveBeenCalled();

  document.body.removeChild(scrollableContainer);
  wrapper.unmount();
});

test('useGlobalSwipe should not call onPan when touch starts inside child of horizontally scrollable element', () => {
  const onPan = vi.fn();

  const scrollableContainer = document.createElement('div');
  Object.defineProperty(scrollableContainer, 'scrollWidth', { value: 500, configurable: true });
  Object.defineProperty(scrollableContainer, 'clientWidth', { value: 300, configurable: true });
  scrollableContainer.style.overflowX = 'scroll';

  const childElement = document.createElement('button');
  scrollableContainer.appendChild(childElement);
  document.body.appendChild(scrollableContainer);

  const wrapper = mount(createTestComponent(onPan, () => true));

  const touchEvent = createTouchEvent('touchstart', 100, 100);
  Object.defineProperty(touchEvent, 'target', { value: childElement, configurable: true });
  document.dispatchEvent(touchEvent);

  dispatchTouchEvent('touchmove', 150, 100);

  expect(onPan).not.toHaveBeenCalled();

  document.body.removeChild(scrollableContainer);
  wrapper.unmount();
});

test('useGlobalSwipe should call onPan when element has overflow-x but no scrollable content', () => {
  const onPan = vi.fn();

  const container = document.createElement('div');
  Object.defineProperty(container, 'scrollWidth', { value: 300, configurable: true });
  Object.defineProperty(container, 'clientWidth', { value: 300, configurable: true });
  container.style.overflowX = 'auto';
  document.body.appendChild(container);

  const wrapper = mount(createTestComponent(onPan, () => true));

  const touchEvent = createTouchEvent('touchstart', 100, 100);
  Object.defineProperty(touchEvent, 'target', { value: container, configurable: true });
  document.dispatchEvent(touchEvent);

  const moveEvent = createTouchEvent('touchmove', 150, 100);
  document.dispatchEvent(moveEvent);

  expect(onPan).toHaveBeenCalled();

  document.body.removeChild(container);
  wrapper.unmount();
});

test('useGlobalSwipe should call onPan when element is not horizontally scrollable', () => {
  const onPan = vi.fn();

  const container = document.createElement('div');
  Object.defineProperty(container, 'scrollWidth', { value: 500, configurable: true });
  Object.defineProperty(container, 'clientWidth', { value: 300, configurable: true });
  container.style.overflowX = 'hidden';
  document.body.appendChild(container);

  const wrapper = mount(createTestComponent(onPan, () => true));

  const touchEvent = createTouchEvent('touchstart', 100, 100);
  Object.defineProperty(touchEvent, 'target', { value: container, configurable: true });
  document.dispatchEvent(touchEvent);

  const moveEvent = createTouchEvent('touchmove', 150, 100);
  document.dispatchEvent(moveEvent);

  expect(onPan).toHaveBeenCalled();

  document.body.removeChild(container);
  wrapper.unmount();
});
