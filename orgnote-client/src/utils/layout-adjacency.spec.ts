import { expect, test } from 'vitest';
import type { LayoutNode, LayoutOrientation } from 'orgnote-api';
import { getAdjacentPaneId } from './layout-adjacency';

const pane = (paneId: string): LayoutNode => ({
  type: 'pane',
  id: `node-${paneId}`,
  paneId,
});

const split = (
  id: string,
  orientation: LayoutOrientation,
  children: LayoutNode[],
  sizes?: number[],
): LayoutNode => ({
  type: 'split',
  id,
  orientation,
  children,
  sizes,
});

const gridLayout = split('root', 'horizontal', [
  split('left', 'vertical', [pane('top-left'), pane('bottom-left')]),
  split('right', 'vertical', [pane('top-right'), pane('bottom-right')]),
]);

test('getAdjacentPaneId returns the other pane in a horizontal split', () => {
  const layout = split('root', 'horizontal', [pane('left'), pane('right')]);

  expect(getAdjacentPaneId(layout, 'left')).toBe('right');
  expect(getAdjacentPaneId(layout, 'right')).toBe('left');
});

test('getAdjacentPaneId returns the other pane in a vertical split', () => {
  const layout = split('root', 'vertical', [pane('top'), pane('bottom')]);

  expect(getAdjacentPaneId(layout, 'top')).toBe('bottom');
  expect(getAdjacentPaneId(layout, 'bottom')).toBe('top');
});

test('getAdjacentPaneId returns the sibling in the immediate parent split', () => {
  expect(getAdjacentPaneId(gridLayout, 'bottom-right')).toBe('top-right');
  expect(getAdjacentPaneId(gridLayout, 'top-left')).toBe('bottom-left');
});

test('getAdjacentPaneId ignores diagonal panes', () => {
  const diagonalResult = getAdjacentPaneId(gridLayout, 'bottom-right');

  expect(diagonalResult).not.toBe('top-left');
});

test('getAdjacentPaneId works with nested splits', () => {
  const layout = split(
    'root',
    'horizontal',
    [pane('left'), split('right', 'vertical', [pane('top-right'), pane('bottom-right')])],
    [25, 75],
  );

  expect(getAdjacentPaneId(layout, 'bottom-right')).toBe('top-right');
});

test('getAdjacentPaneId returns undefined without another pane', () => {
  expect(getAdjacentPaneId(pane('only'), 'only')).toBeUndefined();
  expect(getAdjacentPaneId(undefined, 'only')).toBeUndefined();
  expect(getAdjacentPaneId(pane('only'), undefined)).toBeUndefined();
});
