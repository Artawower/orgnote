import { expect, test } from 'vitest';
import type { GraphNodeViewModel } from 'src/models/graph';
import { reconcileGraphNodes } from './use-graph-renderer';

const node = (
  id: string,
  extra: Partial<GraphNodeViewModel> & { x?: number; y?: number; vx?: number; vy?: number } = {},
): GraphNodeViewModel & { x?: number; y?: number } => ({
  id,
  label: id,
  weight: 1,
  path: `/${id}.org`,
  ...extra,
});

test('reconcileGraphNodes reuses existing node objects and keeps their positions', () => {
  const existing = node('a', { x: 10, y: 20, vx: 1, vy: 2 });

  const { nodes, added } = reconcileGraphNodes(
    [existing],
    [node('a', { label: 'Alpha', weight: 5 })],
  );

  expect(nodes[0]).toBe(existing);
  expect(nodes[0]!.x).toBe(10);
  expect(nodes[0]!.y).toBe(20);
  expect(nodes[0]!.label).toBe('Alpha');
  expect(nodes[0]!.weight).toBe(5);
  expect(added).toEqual([]);
});

test('reconcileGraphNodes reports only newly added nodes', () => {
  const existing = node('a', { x: 1, y: 1 });

  const { nodes, added } = reconcileGraphNodes([existing], [node('a'), node('b')]);

  expect(nodes.map((n) => n.id)).toEqual(['a', 'b']);
  expect(added.map((n) => n.id)).toEqual(['b']);
  expect(nodes[0]).toBe(existing);
});

test('reconcileGraphNodes drops removed nodes without reporting additions', () => {
  const a = node('a', { x: 1, y: 1 });
  const b = node('b', { x: 2, y: 2 });

  const { nodes, added } = reconcileGraphNodes([a, b], [node('a')]);

  expect(nodes.map((n) => n.id)).toEqual(['a']);
  expect(added).toEqual([]);
});
