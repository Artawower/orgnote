import type { CompletionCandidate } from 'orgnote-api';
import { toValue } from 'vue';
import type { GroupedCompletionCandidate } from 'src/models/grouped-completion-candidate';

const UNGROUPED = Symbol('ungrouped');

type CompletionDisplayItem = GroupedCompletionCandidate | undefined;
type GroupKey = string | typeof UNGROUPED;
type IndexedCandidate = { readonly candidate: CompletionCandidate; readonly index: number };

export interface CompletionDisplayModel {
  readonly items: CompletionDisplayItem[];
  readonly groupTitles: string[];
  readonly candidateToDisplayIndex: number[];
  readonly displayToCandidateIndex: (number | undefined)[];
}

const getGroupKey = (candidate: CompletionCandidate): GroupKey =>
  toValue(candidate.group) || UNGROUPED;

const buildFlatDisplayModel = (
  candidates: readonly (CompletionCandidate | undefined)[],
): CompletionDisplayModel => {
  const indexes = Array.from({ length: candidates.length }, (_, index) => index);
  return {
    items: [...candidates],
    groupTitles: [],
    candidateToDisplayIndex: indexes,
    displayToCandidateIndex: indexes,
  };
};

const collectCandidateGroups = (
  candidates: readonly (CompletionCandidate | undefined)[],
): Map<GroupKey, IndexedCandidate[]> => {
  const groups = new Map<GroupKey, IndexedCandidate[]>();
  candidates.forEach((candidate, index) => {
    if (!candidate) return;
    const groupKey = getGroupKey(candidate);
    const groupCandidates = groups.get(groupKey) ?? [];
    groupCandidates.push({ candidate, index });
    groups.set(groupKey, groupCandidates);
  });
  return groups;
};

const buildGroupedDisplayModel = (
  candidates: readonly (CompletionCandidate | undefined)[],
): CompletionDisplayModel => {
  const model: CompletionDisplayModel = {
    items: [],
    groupTitles: [],
    candidateToDisplayIndex: [],
    displayToCandidateIndex: [],
  };
  collectCandidateGroups(candidates).forEach((groupCandidates, groupKey) => {
    if (groupKey !== UNGROUPED) {
      model.groupTitles.push(groupKey);
      model.items.push({ groupTitle: groupKey });
      model.displayToCandidateIndex.push(undefined);
    }
    groupCandidates.forEach(({ candidate, index }) => {
      model.candidateToDisplayIndex[index] = model.items.length;
      model.displayToCandidateIndex.push(index);
      model.items.push({ ...candidate, index });
    });
  });
  return model;
};

export const buildCompletionDisplayModel = (
  candidates: readonly (CompletionCandidate | undefined)[],
  isGroupingEnabled: boolean,
): CompletionDisplayModel =>
  isGroupingEnabled ? buildGroupedDisplayModel(candidates) : buildFlatDisplayModel(candidates);
