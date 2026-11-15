import type { Directive } from 'vue';
import { useScreenDetection } from 'src/composables/use-screen-detection';

const HANDLER_KEY = Symbol('clickMobileHandler');

interface ClickMobileElement extends HTMLElement {
  [HANDLER_KEY]?: (e: MouseEvent) => void;
}

export const vClickMobile: Directive<ClickMobileElement, () => void> = {
  mounted: (el, { value: callback }) => {
    const { mobile } = useScreenDetection();

    const handler = () => {
      if (!mobile.value) return;
      callback();
    };

    el[HANDLER_KEY] = handler;
    el.addEventListener('click', handler);
  },
  unmounted: (el) => {
    const handler = el[HANDLER_KEY];
    if (!handler) return;
    el.removeEventListener('click', handler);
    delete el[HANDLER_KEY];
  },
};
