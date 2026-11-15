import { onUnmounted, readonly, ref, watch, type Ref } from 'vue';
import { NAV_TAB_ID_SELECTOR, ORGNOTE_TAB_FORMAT } from 'src/constants/orgnote-tab';
import {
  getAutoScrollDirection,
  getTabGapIndex,
  getTabGapOffset,
  type HorizontalSpan,
} from 'src/utils/tab-drop-position';

export const TAB_STRIP_AUTO_SCROLL_EDGE_PX = 32;
export const TAB_STRIP_AUTO_SCROLL_STEP_PX = 8;

export interface TabStripDropOptions {
  dropArea: Readonly<Ref<HTMLElement | undefined>>;
  scrollContainer: Readonly<Ref<HTMLElement | undefined>>;
  isDragActive: Readonly<Ref<boolean>>;
  onTabDrop: (gapIndex: number) => void;
}

const isTabDrag = (event: DragEvent): boolean =>
  !!event.dataTransfer?.types.includes(ORGNOTE_TAB_FORMAT);

const getTabSpans = (container: HTMLElement): HorizontalSpan[] =>
  [...container.querySelectorAll<HTMLElement>(NAV_TAB_ID_SELECTOR)].map((tab) =>
    tab.getBoundingClientRect(),
  );

const toContentOffset = (viewportX: number, container: HTMLElement): number =>
  viewportX - container.getBoundingClientRect().left + container.scrollLeft;

const canScrollInDirection = (container: HTMLElement, direction: -1 | 0 | 1): boolean => {
  if (direction < 0) return container.scrollLeft > 0;
  if (direction > 0) return container.scrollLeft + container.clientWidth < container.scrollWidth;
  return false;
};

const isLeavingElement = (event: DragEvent, element: HTMLElement | undefined): boolean => {
  const nextTarget = event.relatedTarget;
  if (!(nextTarget instanceof Node)) return true;
  return !element?.contains(nextTarget);
};

export function useTabStripDrop(options: TabStripDropOptions) {
  const indicatorOffset = ref<number | undefined>();
  let pointerX: number | undefined;
  let scrollDirection: -1 | 0 | 1 = 0;
  let scrollFrame: number | undefined;

  const getGapIndex = (container: HTMLElement, x: number): number =>
    getTabGapIndex(x, getTabSpans(container));

  const updateIndicator = (): void => {
    const container = options.scrollContainer.value;
    if (!container || pointerX === undefined) return;
    const spans = getTabSpans(container);
    const gapOffset = getTabGapOffset(getTabGapIndex(pointerX, spans), spans);
    indicatorOffset.value =
      gapOffset === undefined ? undefined : toContentOffset(gapOffset, container);
  };

  const stopAutoScroll = (): void => {
    scrollDirection = 0;
    if (scrollFrame === undefined) return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = undefined;
  };

  const scrollStep = (): void => {
    const container = options.scrollContainer.value;
    if (!container || !canScrollInDirection(container, scrollDirection)) {
      stopAutoScroll();
      return;
    }
    container.scrollLeft += scrollDirection * TAB_STRIP_AUTO_SCROLL_STEP_PX;
    updateIndicator();
    scrollFrame = requestAnimationFrame(scrollStep);
  };

  const updateAutoScroll = (container: HTMLElement, x: number): void => {
    scrollDirection = getAutoScrollDirection(
      x,
      container.getBoundingClientRect(),
      TAB_STRIP_AUTO_SCROLL_EDGE_PX,
    );
    if (!canScrollInDirection(container, scrollDirection)) {
      stopAutoScroll();
      return;
    }
    if (scrollFrame !== undefined) return;
    scrollFrame = requestAnimationFrame(scrollStep);
  };

  const reset = (): void => {
    stopAutoScroll();
    pointerX = undefined;
    indicatorOffset.value = undefined;
  };

  const handleDragOver = (event: DragEvent): void => {
    const container = options.scrollContainer.value;
    if (!container || !isTabDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    pointerX = event.clientX;
    updateIndicator();
    updateAutoScroll(container, event.clientX);
  };

  const handleDragLeave = (event: DragEvent): void => {
    if (!isLeavingElement(event, options.dropArea.value)) return;
    reset();
  };

  const handleDrop = (event: DragEvent): void => {
    const container = options.scrollContainer.value;
    if (!container || !isTabDrag(event)) return;
    event.preventDefault();
    const gapIndex = getGapIndex(container, event.clientX);
    reset();
    options.onTabDrop(gapIndex);
  };

  watch(options.isDragActive, (isActive) => {
    if (!isActive) reset();
  });

  onUnmounted(reset);

  return {
    indicatorOffset: readonly(indicatorOffset),
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
