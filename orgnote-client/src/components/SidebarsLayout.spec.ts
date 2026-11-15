import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';
import SidebarsLayout from './SidebarsLayout.vue';

vi.mock('src/composables/use-app-resume', () => ({
  useAppResume: () => () => undefined,
}));

const createTouchEvent = (
  type: 'touchstart' | 'touchmove',
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
    touches: touchList,
    changedTouches: touchList,
    bubbles: true,
    cancelable: true,
    composedPath: () => [],
  } as unknown as TouchEvent;
};

const dispatchTouchDrag = (): void => {
  document.dispatchEvent(createTouchEvent('touchstart', 0, 100));
  document.dispatchEvent(createTouchEvent('touchmove', 120, 100));
};

const createWrapper = () =>
  mount(SidebarsLayout, {
    props: {
      isMobile: true,
      leftOpened: false,
    },
    slots: {
      default: '<div>Main</div>',
      left: '<div>Left sidebar</div>',
    },
  });

const setVisibilityState = (value: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value,
  });
};

beforeEach(() => {
  vi.spyOn(window, 'getSelection').mockReturnValue({
    toString: () => '',
  } as Selection);
  setVisibilityState('visible');
});

afterEach(() => {
  vi.restoreAllMocks();
  setVisibilityState('visible');
});

test('SidebarsLayout resets dragged left sidebar on visibilitychange', async () => {
  const wrapper = createWrapper();

  dispatchTouchDrag();
  await nextTick();

  const drawerBeforeReset = wrapper.find('.mobile-sidebar.left');
  const backdropBeforeReset = wrapper.find('.mobile-backdrop.left');

  expect(drawerBeforeReset.attributes('style')).toContain('translateX(');
  expect(backdropBeforeReset.classes()).toContain('visible');

  setVisibilityState('hidden');
  document.dispatchEvent(new Event('visibilitychange'));
  await nextTick();

  const drawerAfterReset = wrapper.find('.mobile-sidebar.left');
  const backdropAfterReset = wrapper.find('.mobile-backdrop.left');

  expect(drawerAfterReset.attributes('style')).toBeUndefined();
  expect(backdropAfterReset.classes()).not.toContain('visible');
  expect(backdropAfterReset.attributes('style')).toContain('opacity: 0');
  expect(backdropAfterReset.attributes('style')).toContain('pointer-events: none');

  wrapper.unmount();
});

test('SidebarsLayout resets dragged left sidebar on pagehide', async () => {
  const wrapper = createWrapper();

  dispatchTouchDrag();
  await nextTick();

  const drawerBeforeReset = wrapper.find('.mobile-sidebar.left');
  const backdropBeforeReset = wrapper.find('.mobile-backdrop.left');

  expect(drawerBeforeReset.attributes('style')).toContain('translateX(');
  expect(backdropBeforeReset.classes()).toContain('visible');

  window.dispatchEvent(new Event('pagehide'));
  await nextTick();

  const drawerAfterReset = wrapper.find('.mobile-sidebar.left');
  const backdropAfterReset = wrapper.find('.mobile-backdrop.left');

  expect(drawerAfterReset.attributes('style')).toBeUndefined();
  expect(backdropAfterReset.classes()).not.toContain('visible');
  expect(backdropAfterReset.attributes('style')).toContain('opacity: 0');
  expect(backdropAfterReset.attributes('style')).toContain('pointer-events: none');

  wrapper.unmount();
});
