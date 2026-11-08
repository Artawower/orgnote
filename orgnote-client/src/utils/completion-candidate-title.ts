import type { CompletionCandidate } from 'orgnote-api';
import { toValue } from 'vue';

export const getCandidateTitle = <T>(candidate: CompletionCandidate<T>): string => {
  const title = toValue(candidate.title);
  return typeof title === 'string' ? title.toLowerCase() : '';
};
