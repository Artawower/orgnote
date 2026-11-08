import { expect, test } from 'vitest';
import type { FileMeta } from 'orgnote-api';
import type { GraphNodeViewModel } from 'src/models/graph';
import { buildGraphFromFileMetas } from './build-graph';

const createMeta = (params: Partial<FileMeta> & Pick<FileMeta, 'id' | 'filePath'>): FileMeta => ({
  id: params.id,
  filePath: params.filePath,
  title: params.title,
  links: params.links,
  backlinks: params.backlinks,
});

test('buildGraphFromFileMetas creates nodes with fallback labels and paths', () => {
  const result = buildGraphFromFileMetas([
    createMeta({ id: 'a', filePath: ['notes', 'alpha.org'], title: 'Alpha' }),
    createMeta({ id: 'b', filePath: ['notes', 'beta.org'] }),
  ]);

  expect(result.graph.nodes).toEqual([
    { id: 'a', label: 'Alpha', path: '/notes/alpha.org', weight: 1 },
    { id: 'b', label: 'beta.org', path: '/notes/beta.org', weight: 1 },
  ]);
});

test('buildGraphFromFileMetas creates undirected unique edges from links and backlinks', () => {
  const result = buildGraphFromFileMetas([
    createMeta({ id: 'a', filePath: ['a.org'], links: ['b'] }),
    createMeta({ id: 'b', filePath: ['b.org'], backlinks: ['a'] }),
  ]);

  expect(result.graph.edges).toEqual([{ id: 'a::b', source: 'a', target: 'b' }]);
});

test('buildGraphFromFileMetas de-duplicates reciprocal links and increments weights once', () => {
  const result = buildGraphFromFileMetas([
    createMeta({ id: 'a', filePath: ['a.org'], links: ['b'] }),
    createMeta({ id: 'b', filePath: ['b.org'], links: ['a'] }),
  ]);

  expect(result.graph.edges).toEqual([{ id: 'a::b', source: 'a', target: 'b' }]);

  const nodeById = Object.fromEntries(
    result.graph.nodes.map((node: GraphNodeViewModel) => [node.id, node]),
  );

  expect(nodeById.a?.weight).toBe(2);
  expect(nodeById.b?.weight).toBe(2);
});

test('buildGraphFromFileMetas ignores self links and missing targets', () => {
  const result = buildGraphFromFileMetas([
    createMeta({ id: 'a', filePath: ['a.org'], links: ['a', 'missing'] }),
  ]);

  expect(result.graph.edges).toEqual([]);
  expect(result.adjacency).toEqual({ a: [] });
});

test('buildGraphFromFileMetas increments both node weights for each undirected edge', () => {
  const result = buildGraphFromFileMetas([
    createMeta({ id: 'a', filePath: ['a.org'], links: ['b', 'c'] }),
    createMeta({ id: 'b', filePath: ['b.org'] }),
    createMeta({ id: 'c', filePath: ['c.org'] }),
  ]);

  const nodeById = Object.fromEntries(
    result.graph.nodes.map((node: GraphNodeViewModel) => [node.id, node]),
  );

  expect(nodeById.a?.weight).toBe(3);
  expect(nodeById.b?.weight).toBe(2);
  expect(nodeById.c?.weight).toBe(2);
});

test('buildGraphFromFileMetas creates adjacency for highlighting', () => {
  const result = buildGraphFromFileMetas([
    createMeta({ id: 'a', filePath: ['a.org'], links: ['b'] }),
    createMeta({ id: 'b', filePath: ['b.org'] }),
  ]);

  expect(result.adjacency).toEqual({
    a: ['b'],
    b: ['a'],
  });
});
