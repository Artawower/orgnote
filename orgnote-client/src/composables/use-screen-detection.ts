import { computed, effectScope } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { getNumericCssVar } from 'src/utils/css-utils';
import { hasWindow } from 'src/utils/platform-specific';
import { TABLET_BREAKPOINT, DESKTOP_BREAKPOINT } from 'src/constants/breakpoints';

export function createScreenDetection() {
  const { width } = useWindowSize({ includeScrollbar: true });
  const tablet = hasWindow()
    ? (getNumericCssVar('--tablet') ?? TABLET_BREAKPOINT)
    : TABLET_BREAKPOINT;
  const desktop = hasWindow()
    ? (getNumericCssVar('--desktop') ?? DESKTOP_BREAKPOINT)
    : DESKTOP_BREAKPOINT;

  const desktopAbove = computed(() => width.value > desktop);
  const desktopBelow = computed(() => width.value < desktop);
  const tabletBelow = computed(() => width.value < tablet);
  const tabletAbove = computed(() => width.value >= tablet);
  const mobile = computed(() => width.value < tablet);

  return {
    screenWidth: width,
    desktopAbove,
    desktopBelow,
    tabletBelow,
    tabletAbove,
    mobile,
  };
}

let _screen: ReturnType<typeof createScreenDetection> | null = null;
let _scope: ReturnType<typeof effectScope> | null = null;

export function useScreenDetection() {
  if (_screen) return _screen;
  _scope = effectScope(true);
  _screen = _scope.run(createScreenDetection)!;
  return _screen;
}
