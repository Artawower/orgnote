import DiffMatchPatch, { type Diff } from 'diff-match-patch';

export interface ContentInsertion {
  start: number;
  length: number;
}

interface DiffScan {
  sourceOffset: number;
  insertion: ContentInsertion | null;
  isValid: boolean;
}

const DIFF_EQUAL = 0;
const DIFF_DELETE = -1;
const INITIAL_SCAN: DiffScan = { sourceOffset: 0, insertion: null, isValid: true };
const diffEngine = new DiffMatchPatch();

const scanDiff = (state: DiffScan, [operation, text]: Diff): DiffScan => {
  if (!state.isValid) return state;
  if (operation === DIFF_DELETE) return { ...state, isValid: false };
  if (operation === DIFF_EQUAL) return { ...state, sourceOffset: state.sourceOffset + text.length };
  if (state.insertion) return { ...state, isValid: false };
  return { ...state, insertion: { start: state.sourceOffset, length: text.length } };
};

export const resolveContentInsertion = (
  content: string,
  nextContent: string,
): ContentInsertion | null => {
  const scan = diffEngine.diff_main(content, nextContent).reduce(scanDiff, INITIAL_SCAN);
  if (!scan.isValid) return null;
  return scan.insertion;
};
