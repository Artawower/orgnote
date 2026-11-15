export interface VisibleRange {
  readonly start: number;
  readonly end: number;
}

export type ScrollAlign = 'start' | 'center' | 'end' | 'auto';

export interface AppVirtualListExpose {
  scrollToIndex(index: number, align?: ScrollAlign): void;
}
