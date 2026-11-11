import { expect, test } from 'vitest';
import {
  getAutoScrollDirection,
  getTabGapIndex,
  getTabGapOffset,
  resolveReorderIndex,
} from './tab-drop-position';

const TAB_SPANS = [
  { left: 0, width: 100 },
  { left: 100, width: 100 },
  { left: 200, width: 100 },
];

test('getTabGapIndex returns 0 before the first tab center', () => {
  expect(getTabGapIndex(-20, TAB_SPANS)).toBe(0);
  expect(getTabGapIndex(49, TAB_SPANS)).toBe(0);
});

test('getTabGapIndex returns the gap between tabs by midpoints', () => {
  expect(getTabGapIndex(51, TAB_SPANS)).toBe(1);
  expect(getTabGapIndex(160, TAB_SPANS)).toBe(2);
});

test('getTabGapIndex returns the trailing gap after the last tab center', () => {
  expect(getTabGapIndex(260, TAB_SPANS)).toBe(3);
  expect(getTabGapIndex(900, TAB_SPANS)).toBe(3);
});

test('getTabGapIndex returns 0 for an empty strip', () => {
  expect(getTabGapIndex(50, [])).toBe(0);
});

test('getTabGapOffset returns the left edge of the tab after the gap', () => {
  expect(getTabGapOffset(0, TAB_SPANS)).toBe(0);
  expect(getTabGapOffset(2, TAB_SPANS)).toBe(200);
});

test('getTabGapOffset returns the right edge of the last tab for the trailing gap', () => {
  expect(getTabGapOffset(3, TAB_SPANS)).toBe(300);
});

test('getTabGapOffset returns undefined for an empty strip', () => {
  expect(getTabGapOffset(0, [])).toBeUndefined();
});

test('resolveReorderIndex moves a tab left to the gap index', () => {
  expect(resolveReorderIndex(2, 0)).toBe(0);
  expect(resolveReorderIndex(2, 1)).toBe(1);
});

test('resolveReorderIndex compensates the removed tab when moving right', () => {
  expect(resolveReorderIndex(0, 2)).toBe(1);
  expect(resolveReorderIndex(0, 3)).toBe(2);
});

test('resolveReorderIndex returns undefined for both gaps around the original position', () => {
  expect(resolveReorderIndex(1, 1)).toBeUndefined();
  expect(resolveReorderIndex(1, 2)).toBeUndefined();
});

test('getAutoScrollDirection detects the edge bands of the container', () => {
  const container = { left: 100, width: 400 };

  expect(getAutoScrollDirection(110, container, 32)).toBe(-1);
  expect(getAutoScrollDirection(300, container, 32)).toBe(0);
  expect(getAutoScrollDirection(490, container, 32)).toBe(1);
});

test('getAutoScrollDirection splits overlapping edge bands of a narrow container', () => {
  const container = { left: 0, width: 40 };

  expect(getAutoScrollDirection(31, container, 32)).toBe(1);
  expect(getAutoScrollDirection(9, container, 32)).toBe(-1);
});
