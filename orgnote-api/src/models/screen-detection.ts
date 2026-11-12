import type { ComputedRef, Ref } from 'vue';

export interface ScreenDetection {
  screenWidth: Ref<number>;
  desktopAbove: ComputedRef<boolean>;
  desktopBelow: ComputedRef<boolean>;
  tabletBelow: ComputedRef<boolean>;
  tabletAbove: ComputedRef<boolean>;
  mobile: ComputedRef<boolean>;
}

export type UseScreenDetection = () => ScreenDetection;
