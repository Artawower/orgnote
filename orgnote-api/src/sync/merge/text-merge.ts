import DiffMatchPatch from 'diff-match-patch';
import { textToUint8Array, uint8ArrayToText } from '../../utils/binary';
import type { MergeInputs, MergeResult } from '../types';
import { MergeOutcome } from '../types';

const dmp = new DiffMatchPatch();

type ChangeRegion = {
  baseStart: number;
  baseEnd: number;
  replacement: string;
};

type PendingRegion = { start: number; replacement: string };

type DiffState = {
  regions: ChangeRegion[];
  basePos: number;
  pending: PendingRegion | null;
};

type TextTriplet = {
  base: string;
  local: string;
  remote: string;
};

const DIFF_EQUAL = 0;
const DIFF_DELETE = -1;
const DIFF_INSERT = 1;

const INITIAL_STATE: DiffState = {
  regions: [],
  basePos: 0,
  pending: null,
};

const commitPending = (state: DiffState): DiffState => {
  if (!state.pending) return state;

  const { start, replacement } = state.pending;
  return {
    regions: [
      ...state.regions,
      { baseStart: start, baseEnd: state.basePos, replacement },
    ],
    basePos: state.basePos,
    pending: null,
  };
};

const ensurePending = (state: DiffState): DiffState => {
  if (state.pending) return state;

  return { ...state, pending: { start: state.basePos, replacement: '' } };
};

const applyEqual = (state: DiffState, text: string): DiffState => ({
  ...commitPending(state),
  basePos: state.basePos + text.length,
  pending: null,
});

const applyDelete = (state: DiffState, text: string): DiffState => ({
  ...ensurePending(state),
  basePos: state.basePos + text.length,
});

const applyInsert = (state: DiffState, text: string): DiffState => {
  const opened = ensurePending(state);
  return {
    ...opened,
    pending: {
      start: opened.pending!.start,
      replacement: opened.pending!.replacement + text,
    },
  };
};

const OP_HANDLERS: Record<number, (s: DiffState, t: string) => DiffState> = {
  [DIFF_EQUAL]: applyEqual,
  [DIFF_DELETE]: applyDelete,
  [DIFF_INSERT]: applyInsert,
};

const applyDiffOp = (state: DiffState, [op, text]: DiffMatchPatch.Diff): DiffState =>
  OP_HANDLERS[op](state, text);

const diffToChangeRegions = (diffs: DiffMatchPatch.Diff[]): ChangeRegion[] => {
  const finalState = diffs.reduce(applyDiffOp, INITIAL_STATE);
  return commitPending(finalState).regions;
};

const regionsOverlap = (
  local: ChangeRegion[],
  remote: ChangeRegion[]
): boolean =>
  local.some((lr) =>
    remote.some(
      (rr) => lr.baseStart < rr.baseEnd && rr.baseStart < lr.baseEnd
    )
  );

const applyRegionsToBase = (
  baseText: string,
  regions: ChangeRegion[]
): string => {
  const sorted = [...regions].sort((a, b) => a.baseStart - b.baseStart);
  let lastEnd = 0;

  return (
    sorted
      .map(({ baseStart, baseEnd, replacement }) => {
        const chunk = baseText.substring(lastEnd, baseStart) + replacement;
        lastEnd = baseEnd;
        return chunk;
      })
      .join('') + baseText.substring(lastEnd)
  );
};

const computeDiffs = (
  baseText: string,
  changedText: string
): DiffMatchPatch.Diff[] => {
  const diffs = dmp.diff_main(baseText, changedText);
  dmp.diff_cleanupSemantic(diffs);
  return diffs;
};

const mergeThreeWay = (
  baseText: string,
  localText: string,
  remoteText: string
): string | null => {
  const localRegions = diffToChangeRegions(computeDiffs(baseText, localText));
  const remoteRegions = diffToChangeRegions(computeDiffs(baseText, remoteText));

  if (regionsOverlap(localRegions, remoteRegions)) return null;

  return applyRegionsToBase(baseText, [...localRegions, ...remoteRegions]);
};

type ShortCircuitRule = {
  matches: (t: TextTriplet) => boolean;
  pick: (t: TextTriplet) => string;
};

const SHORT_CIRCUIT_RULES: readonly ShortCircuitRule[] = [
  { matches: ({ base, local }) => base === local, pick: ({ remote }) => remote },
  { matches: ({ base, remote }) => base === remote, pick: ({ local }) => local },
  { matches: ({ local, remote }) => local === remote, pick: ({ local }) => local },
];

const toTextTriplet = (inputs: MergeInputs): TextTriplet => ({
  base: uint8ArrayToText(inputs.base),
  local: uint8ArrayToText(inputs.local),
  remote: uint8ArrayToText(inputs.remote),
});

const resolveShortCircuit = (triplet: TextTriplet): string | null =>
  SHORT_CIRCUIT_RULES.find((rule) => rule.matches(triplet))?.pick(triplet) ?? null;

const toMergedResult = (merged: string | null): MergeResult => {
  if (merged === null) return { outcome: MergeOutcome.Ambiguous };

  return { outcome: MergeOutcome.Merged, mergedContent: textToUint8Array(merged) };
};

const resolveByteShortCircuit = (
  inputs: MergeInputs
): MergeResult | null => {
  const baseEmpty = inputs.base.length === 0;
  const localEmpty = inputs.local.length === 0;
  const remoteEmpty = inputs.remote.length === 0;

  if (baseEmpty && localEmpty) {
    return { outcome: MergeOutcome.Merged, mergedContent: inputs.remote };
  }

  if (baseEmpty && remoteEmpty) {
    return { outcome: MergeOutcome.Merged, mergedContent: inputs.local };
  }

  return null;
};

export const mergeText = (inputs: MergeInputs): MergeResult => {
  const shortCircuit = resolveByteShortCircuit(inputs);
  if (shortCircuit) return shortCircuit;

  const triplet = toTextTriplet(inputs);
  const merged =
    resolveShortCircuit(triplet)
    ?? mergeThreeWay(triplet.base, triplet.local, triplet.remote);

  return toMergedResult(merged);
};
