import type { OrgNode } from 'org-mode-ast';
import type { CommonEmbeddedWidget } from 'orgnote-api';
import { findHighestPriorityWidget } from 'src/utils/org-editor/widgets/find-highest-priority-widget';
import { expect, test } from 'vitest';

const createNode = (type = 'Text'): OrgNode => ({ type, start: 0, end: 10 }) as unknown as OrgNode;

const createWidget = (
  id: string,
  options: { priority?: number; satisfied?: (n: OrgNode) => boolean } = {},
): CommonEmbeddedWidget => ({
  id,
  priority: options.priority,
  satisfied: options.satisfied,
});

test('findHighestPriorityWidget returns undefined for empty array', () => {
  expect(findHighestPriorityWidget([], createNode())).toBeUndefined();
});

test('findHighestPriorityWidget returns undefined for undefined input', () => {
  expect(findHighestPriorityWidget(undefined, createNode())).toBeUndefined();
});

test('findHighestPriorityWidget returns single matching widget without satisfied', () => {
  const widget = createWidget('w1');
  expect(findHighestPriorityWidget([widget], createNode())).toBe(widget);
});

test('findHighestPriorityWidget returns widget when satisfied returns true', () => {
  const widget = createWidget('w1', { satisfied: () => true });
  expect(findHighestPriorityWidget([widget], createNode())).toBe(widget);
});

test('findHighestPriorityWidget returns undefined when all satisfied return false', () => {
  const widget = createWidget('w1', { satisfied: () => false });
  expect(findHighestPriorityWidget([widget], createNode())).toBeUndefined();
});

test('findHighestPriorityWidget returns highest priority among multiple matches', () => {
  const low = createWidget('low', { priority: 1 });
  const high = createWidget('high', { priority: 10 });
  const medium = createWidget('medium', { priority: 5 });

  const result = findHighestPriorityWidget([low, high, medium], createNode());
  expect(result?.id).toBe('high');
});

test('findHighestPriorityWidget treats missing priority as 0', () => {
  const noPriority = createWidget('none');
  const withPriority = createWidget('has', { priority: 1 });

  const result = findHighestPriorityWidget([noPriority, withPriority], createNode());
  expect(result?.id).toBe('has');
});

test('findHighestPriorityWidget returns first widget when priorities equal', () => {
  const first = createWidget('first', { priority: 5 });
  const second = createWidget('second', { priority: 5 });

  const result = findHighestPriorityWidget([first, second], createNode());
  expect(result?.id).toBe('first');
});

test('findHighestPriorityWidget handles negative priorities correctly', () => {
  const negative = createWidget('negative', { priority: -10 });
  const zero = createWidget('zero', { priority: 0 });

  const result = findHighestPriorityWidget([negative, zero], createNode());
  expect(result?.id).toBe('zero');
});

test('findHighestPriorityWidget skips non-matching widgets regardless of priority', () => {
  const highButNotMatching = createWidget('high', { priority: 100, satisfied: () => false });
  const lowButMatching = createWidget('low', { priority: 1, satisfied: () => true });

  const result = findHighestPriorityWidget([highButNotMatching, lowButMatching], createNode());
  expect(result?.id).toBe('low');
});
