import { MaybeRefOrGetter } from 'vue';

export interface CompletionCandidate<T = unknown> {
  icon?: MaybeRefOrGetter<string | undefined>;
  group?: MaybeRefOrGetter<string | undefined>;
  title?: MaybeRefOrGetter<string | undefined>;
  description?: MaybeRefOrGetter<string | undefined>;
  command: string;
  data: T;
  commandHandler?: (data: T) => void;
}
export interface CompletionSearchResult<T = unknown> {
  total?: number;
  result: CompletionCandidate<T>[];
}
export type CandidateGetterFn<T = unknown> = (
  filter: string,
  limit?: number,
  offset?: number
) => CompletionSearchResult<T> | Promise<CompletionSearchResult<T>>;
export interface CompletionConfigs<T = unknown> {
  searchAutocompletions?: string[];
  itemsGetter?: CandidateGetterFn<T>;
  placeholder?: string;
  itemHeight?: string;
  searchText?: string;
  onClicked?: (candidate: CompletionCandidate<T>) => void;
}
