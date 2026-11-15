import type { Ref } from 'vue';
import { useResize, type ResizeOrientation } from './use-resize';

export type ValueResizeOptions = {
  min?: number;
  max?: number;
  reverse?: boolean;
  unit?: 'percent' | 'pixel';
};

export const useValueResize = (
  orientation: ResizeOrientation,
  value: Ref<number>,
  options: ValueResizeOptions = {},
) => {
  const { min = 0, max = 100, reverse = false, unit = 'percent' } = options;

  let startValue = 0;
  let containerSize = 0;

  const getContainerSize = (el: HTMLElement): number => {
    const parent = el.parentElement;
    if (!parent) return 0;
    return orientation === 'horizontal' ? parent.offsetWidth : parent.offsetHeight;
  };

  const clamp = (v: number): number => Math.max(min, Math.min(v, max));

  const onResize = (delta: number): void => {
    if (containerSize <= 0) return;
    const deltaValue = unit === 'percent' ? (delta / containerSize) * 100 : delta;
    const adjustedDelta = reverse ? -deltaValue : deltaValue;
    value.value = clamp(startValue + adjustedDelta);
  };

  const { isResizing, startResize } = useResize(orientation, onResize);

  const handleResizeStart = (e: MouseEvent): void => {
    startValue = value.value;
    containerSize = getContainerSize(e.target as HTMLElement);
    startResize(e);
  };

  return {
    isResizing,
    handleResizeStart,
  };
};
