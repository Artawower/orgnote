import { MaybeRefOrGetter } from 'vue';
import type { CommandIcon } from './command';
import type { VueComponent } from './vue-component';

export interface CompletionCandidate<T = unknown> {
  icon?: MaybeRefOrGetter<CommandIcon | undefined>;
  group?: MaybeRefOrGetter<string | undefined>;
  title?: MaybeRefOrGetter<string | undefined>;
  description?: MaybeRefOrGetter<string | undefined>;
  data: T;
  commandHandler: (data: T) => void;
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

export type CompletionInputValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export type CompletionInputValidator = (
  value: string,
) => CompletionInputValidationResult | Promise<CompletionInputValidationResult>;

interface BaseCompletionConfig<T = unknown> {
  name?: string;
  searchAutocompletions?: string[];
  placeholder?: string;
  itemHeight?: number;
  itemRenderer?: CompletionItemRenderer<T>;
  searchText?: string;
  onClicked?: (candidate: CompletionCandidate<T>) => void;
  validateInput?: CompletionInputValidator;
}

interface InputCompletionConfig<T = unknown> extends BaseCompletionConfig<T> {
  type: 'input';
  itemsGetter?: CandidateGetterFn<T>;
}

interface SearchCompletionConfig<T = unknown> extends BaseCompletionConfig<T> {
  type?: 'choice' | 'input-choice';
  itemsGetter: CandidateGetterFn<T>;
}

export interface CompletionItemRendererProps<T = unknown> {
  candidate: CompletionCandidate<T>;
  index: number;
  selected: boolean;
  searchQuery: string;
  onSelect: () => void;
}

export type CompletionItemRenderer<T = unknown> = VueComponent & {
  new (): {
    $props: CompletionItemRendererProps<T>;
  };
};

export type CompletionConfig<T = unknown> =
  | InputCompletionConfig<T>
  | SearchCompletionConfig<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Completion<T = any, TResult = any> = CompletionConfig<T> & {
  level?: number;
  candidates?: CompletionCandidate<T>[];
  selectedCandidateIndex?: number;
  total?: number;
  searchQuery: string;
  validationError?: string;
  result: Promise<TResult>;
};

export interface CompletionInterceptorContext {
  completionName: string;
  searchQuery: string;
}

export type CompletionInterceptorTarget = string | string[] | '*';

export interface CompletionInterceptor<T = unknown> {
  name: string;
  target: CompletionInterceptorTarget;
  priority?: number;
  handler: (
    candidates: CompletionCandidate<T>[],
    context: CompletionInterceptorContext,
  ) => CompletionCandidate<T>[] | Promise<CompletionCandidate<T>[]>;
}
