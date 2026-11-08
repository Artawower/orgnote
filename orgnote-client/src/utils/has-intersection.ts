export const hasIntersection = (
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean => {
  const aStart = Math.min(start1, end1);
  const aEnd = Math.max(start1, end1);
  const bStart = Math.min(start2, end2);
  const bEnd = Math.max(start2, end2);

  return aStart <= bEnd && bStart <= aEnd;
};
