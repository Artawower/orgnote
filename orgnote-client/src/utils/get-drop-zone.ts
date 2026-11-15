import type { DropZone } from 'orgnote-api';

export const sanitizeDropZoneRatio = (ratio: number): number => {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0.01;
  if (ratio >= 0.5) return 0.5;
  return ratio;
};

export const getDropZone = (
  x: number,
  y: number,
  rect: DOMRect,
  edgeRatio: number,
): DropZone => {
  const ratio = sanitizeDropZoneRatio(edgeRatio);
  const relativeX = (x - rect.left) / rect.width;
  const relativeY = (y - rect.top) / rect.height;

  if (relativeX < ratio) return 'left';
  if (relativeX > 1 - ratio) return 'right';
  if (relativeY < ratio) return 'top';
  if (relativeY > 1 - ratio) return 'bottom';

  return 'center';
};
