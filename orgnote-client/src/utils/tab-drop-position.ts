export type HorizontalSpan = Pick<DOMRect, 'left' | 'width'>;

const getSpanCenter = (span: HorizontalSpan): number => span.left + span.width / 2;

const getSpanRight = (span: HorizontalSpan): number => span.left + span.width;

export const getTabGapIndex = (pointerX: number, tabSpans: readonly HorizontalSpan[]): number =>
  tabSpans.filter((span) => getSpanCenter(span) < pointerX).length;

export const getTabGapOffset = (
  gapIndex: number,
  tabSpans: readonly HorizontalSpan[],
): number | undefined => {
  const nextTab = tabSpans[gapIndex];
  if (nextTab) return nextTab.left;
  const lastTab = tabSpans.at(-1);
  if (!lastTab) return;
  return getSpanRight(lastTab);
};

export const resolveReorderIndex = (fromIndex: number, gapIndex: number): number | undefined => {
  const isOriginalPosition = gapIndex === fromIndex || gapIndex === fromIndex + 1;
  if (isOriginalPosition) return;
  return gapIndex > fromIndex ? gapIndex - 1 : gapIndex;
};

export const getAutoScrollDirection = (
  pointerX: number,
  container: HorizontalSpan,
  edgeSize: number,
): -1 | 0 | 1 => {
  const bandSize = Math.min(edgeSize, container.width / 2);
  if (pointerX < container.left + bandSize) return -1;
  if (pointerX > getSpanRight(container) - bandSize) return 1;
  return 0;
};
