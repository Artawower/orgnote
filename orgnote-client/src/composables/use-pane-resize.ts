import { useResize, type ResizeOrientation } from './use-resize';

const MIN_PANE_SIZE_PERCENT = 25;

export const usePaneResize = (
  orientation: ResizeOrientation,
  getSizes: () => number[],
  splitIndex: number,
  onUpdate: (sizes: number[]) => void,
) => {
  let startSizes: number[] = [];
  let containerSize = 0;

  const getSplitterCount = (): number => getSizes().length - 1;

  const getContainerSize = (el: HTMLElement): number => {
    const parent = el.parentElement;
    if (!parent) return 0;

    const totalSize = orientation === 'horizontal' ? parent.offsetWidth : parent.offsetHeight;
    const splitterSize = orientation === 'horizontal' ? el.offsetWidth : el.offsetHeight;

    return totalSize - splitterSize * getSplitterCount();
  };

  const clampSizes = (left: number, right: number): [number, number] => {
    const total = left + right;
    if (left < MIN_PANE_SIZE_PERCENT) {
      return [MIN_PANE_SIZE_PERCENT, total - MIN_PANE_SIZE_PERCENT];
    }
    if (right < MIN_PANE_SIZE_PERCENT) {
      return [total - MIN_PANE_SIZE_PERCENT, MIN_PANE_SIZE_PERCENT];
    }
    return [left, right];
  };

  const onResize = (delta: number): void => {
    if (containerSize <= 0) return;
    const deltaPercent = (delta / containerSize) * 100;
    const newSizes = [...startSizes];

    let left = startSizes[splitIndex]! + deltaPercent;
    let right = startSizes[splitIndex + 1]! - deltaPercent;
    [left, right] = clampSizes(left, right);

    newSizes[splitIndex] = left;
    newSizes[splitIndex + 1] = right;

    onUpdate(newSizes);
  };

  const { isResizing, startResize } = useResize(orientation, onResize);

  const handleResizeStart = (e: MouseEvent): void => {
    startSizes = [...getSizes()];
    containerSize = getContainerSize(e.target as HTMLElement);
    startResize(e);
  };

  return {
    isResizing,
    handleResizeStart,
  };
};
