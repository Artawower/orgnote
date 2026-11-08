import { expect, test } from 'vitest';
import { NodeType } from 'org-mode-ast';
import type { OrgNode } from 'org-mode-ast';
import type { InlineEmbeddedWidget } from 'orgnote-api';
import { findHighestPriorityWidget } from './find-highest-priority-widget';

const makeNode = (): OrgNode => ({ type: NodeType.Checkbox }) as unknown as OrgNode;

const makeWidget = (id: string, priority?: number, satisfied?: boolean): InlineEmbeddedWidget => ({
  id,
  decorationType: 'replace',
  priority,
  satisfied: satisfied !== undefined ? () => satisfied : undefined,
  widgetBuilder: () => ({ destroy: () => {} }),
});

test('findHighestPriorityWidget_returnsUndefined_forEmptyList', () => {
  expect(findHighestPriorityWidget([], makeNode())).toBeUndefined();
});

test('findHighestPriorityWidget_returnsUndefined_whenListIsUndefined', () => {
  expect(findHighestPriorityWidget(undefined, makeNode())).toBeUndefined();
});

test('findHighestPriorityWidget_returnsSingleWidget_whenOneMatch', () => {
  const w = makeWidget('a');
  expect(findHighestPriorityWidget([w], makeNode())).toBe(w);
});

test('findHighestPriorityWidget_returnsUndefined_whenSatisfiedIsFalse', () => {
  const w = makeWidget('a', 0, false);
  expect(findHighestPriorityWidget([w], makeNode())).toBeUndefined();
});

test('findHighestPriorityWidget_skipsUnsatisfiedWidgets', () => {
  const bad = makeWidget('bad', 10, false);
  const good = makeWidget('good', 5, true);
  expect(findHighestPriorityWidget([bad, good], makeNode())).toBe(good);
});

test('findHighestPriorityWidget_returnsHighestPriority_whenMultipleMatch', () => {
  const lo = makeWidget('lo', 1);
  const hi = makeWidget('hi', 10);
  const mid = makeWidget('mid', 5);
  expect(findHighestPriorityWidget([lo, hi, mid], makeNode())).toBe(hi);
});

test('findHighestPriorityWidget_treatsMissingPriorityAsZero', () => {
  const noPriority = makeWidget('no');
  const withPriority = makeWidget('with', 1);
  expect(findHighestPriorityWidget([noPriority, withPriority], makeNode())).toBe(withPriority);
});
