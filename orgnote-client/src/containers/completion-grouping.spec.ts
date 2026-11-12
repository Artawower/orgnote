import { expect, test, vi } from 'vitest';
import type { CompletionCandidate } from 'orgnote-api';
import { buildCompletionDisplayModel } from './completion-grouping';

const createCandidate = (title: string, group?: string): CompletionCandidate => ({
  title,
  group,
  data: title,
  commandHandler: vi.fn(),
});

const getDisplayLabels = (items: ReturnType<typeof buildCompletionDisplayModel>['items']) =>
  items.map((item) => {
    if (!item) return;
    return 'groupTitle' in item ? `[${item.groupTitle}]` : item.title;
  });

test('buildCompletionDisplayModel consolidates non-contiguous groups in stable order', () => {
  const candidates = [
    createCandidate('A1', 'A'),
    createCandidate('B1', 'B'),
    createCandidate('A2', 'A'),
  ];

  const model = buildCompletionDisplayModel(candidates, true);

  expect(getDisplayLabels(model.items)).toEqual(['[A]', 'A1', 'A2', '[B]', 'B1']);
  expect(model.groupTitles).toEqual(['A', 'B']);
  expect(model.candidateToDisplayIndex).toEqual([1, 4, 2]);
  expect(model.displayToCandidateIndex).toEqual([undefined, 0, 2, undefined, 1]);
  expect(candidates.some((candidate) => 'index' in candidate)).toBe(false);
});

test('buildCompletionDisplayModel keeps ungrouped candidates in first-appearance order', () => {
  const candidates = [
    createCandidate('U1'),
    createCandidate('A1', 'A'),
    createCandidate('U2'),
    createCandidate('B1', 'B'),
    createCandidate('A2', 'A'),
  ];

  const model = buildCompletionDisplayModel(candidates, true);

  expect(getDisplayLabels(model.items)).toEqual([
    'U1',
    'U2',
    '[A]',
    'A1',
    'A2',
    '[B]',
    'B1',
  ]);
  expect(model.candidateToDisplayIndex).toEqual([0, 3, 1, 6, 4]);
});
