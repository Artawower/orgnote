import type { CompletionCandidate } from 'orgnote-api';

export type IndexedCompletionCandidate = CompletionCandidate & { index?: number };
export type GroupedCompletionCandidate = IndexedCompletionCandidate | { groupTitle: string };
