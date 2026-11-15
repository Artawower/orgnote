import type {
  Completion,
  CompletionSearchResult,
  CompletionInterceptor,
  CompletionCandidate,
  CompletionInterceptorContext,
} from 'orgnote-api';
import { type CompletionConfig, type CompletionStore } from 'orgnote-api';
import { defineStore } from 'pinia';
import { useModalStore } from './modal';
import AppCompletion from 'src/containers/AppCompletion.vue';
import { computed, shallowRef, shallowReactive, ref, markRaw, toValue } from 'vue';
import { watch } from 'vue';
import { debounce } from 'src/utils/debounce';
import { DEFAULT_INPUT_DEBOUNCE } from 'src/constants/default-input-debounce';
import { createPromise } from 'src/utils/create-promise';
import { useConfigStore } from './config';
import { isNullable, to } from 'orgnote-api/utils';
import { logger } from 'src/boot/logger';

const interceptorMatchesTarget = (
  interceptorTarget: CompletionInterceptor['target'],
  completionName: string,
): boolean => {
  if (interceptorTarget === '*') return true;
  if (Array.isArray(interceptorTarget)) return interceptorTarget.includes(completionName);
  return interceptorTarget === completionName;
};

const sortInterceptorsByPriority = <T>(
  interceptors: CompletionInterceptor<T>[],
): CompletionInterceptor<T>[] =>
  [...interceptors].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

const getReconciledTotal = (
  result: CompletionSearchResult,
  offset: number,
  limit: number,
): number => {
  const pageEnd = offset + result.result.length;
  const reportedTotal = result.total ?? pageEnd;
  if (!offset || result.result.length >= limit) return reportedTotal;
  return Math.min(reportedTotal, pageEnd);
};

const resetMissingSelection = (completion: Completion<unknown>): void => {
  const selectedIndex = completion.selectedCandidateIndex;
  if (isNullable(selectedIndex) || selectedIndex < (completion.total ?? 0)) return;
  completion.selectedCandidateIndex = completion.total ? 0 : undefined;
};

const mergeCandidatePage = (
  candidates: CompletionCandidate[],
  page: CompletionCandidate[],
  offset: number,
): CompletionCandidate[] => {
  const mergedCandidates = [...candidates];
  page.forEach((candidate, index) => {
    mergedCandidates[index + offset] = candidate;
  });
  return mergedCandidates;
};

interface CandidateUpdate {
  readonly result: CompletionSearchResult;
  readonly candidates: CompletionCandidate[];
  readonly offset: number;
  readonly limit: number;
}

interface SearchTarget {
  readonly completion: Completion<unknown>;
  readonly query: string;
}

const applyCandidateUpdate = (
  completion: Completion<unknown>,
  update: CandidateUpdate,
): void => {
  const isLengthChanged = update.candidates.length !== update.result.result.length;
  const availableTotal = getReconciledTotal(update.result, update.offset, update.limit);
  if (!update.offset) {
    const total = isLengthChanged ? update.candidates.length : availableTotal;
    completion.candidates = update.candidates;
    completion.total = total;
    completion.selectedCandidateIndex = total ? 0 : undefined;
    return;
  }
  if (!completion.candidates) return;
  const candidates = mergeCandidatePage(completion.candidates, update.candidates, update.offset);
  completion.candidates = candidates;
  completion.total = isLengthChanged ? candidates.length : availableTotal;
  resetMissingSelection(completion);
};

const reportSearchFailure = (error: unknown): void => {
  logger.error('Completion search failed', { error });
};

export const useCompletionStore = defineStore<'completion-store', CompletionStore>(
  'completion-store',
  () => {
    const modal = useModalStore();
    let lastModalConfig: CompletionConfig<unknown> | undefined;
    const openedCompletions = shallowRef<Completion<unknown>[]>([]);
    const interceptors = ref<CompletionInterceptor<unknown>[]>([]);

    const open = async <TItem, TReturn = void>(
      config: CompletionConfig<TItem>,
    ): Promise<TReturn> => {
      const isInputOnly = config.type === 'input';
      const closed = modal.open<TReturn>(AppCompletion, {
        noBodyPadding: true,
        position: 'top',
        mini: isInputOnly,
        modalProps: {
          placeholder: config.placeholder,
          searchText: config.searchText,
        },
      });

      const [result, resolve] = createPromise<TReturn>();
      const completionConfig = {
        ...config,
        itemRenderer: config.itemRenderer ? markRaw(config.itemRenderer) : undefined,
      } as CompletionConfig<unknown>;
      const completion = shallowReactive<Completion<unknown>>({
        ...completionConfig,
        searchQuery: completionConfig.searchText ?? '',
        result,
      });

      openedCompletions.value = [...openedCompletions.value, completion];

      debouncedSearch();
      const res = await closed;
      resolve(res);

      lastModalConfig = completionConfig;
      return res;
    };

    const restore = () => {
      if (!lastModalConfig) {
        return;
      }
      open(lastModalConfig);
      lastModalConfig = undefined;
    };

    const shouldValidateClose = (data: unknown): boolean => {
      const completion = activeCompletion.value;
      if (!completion?.validateInput) return false;
      if (completion.type !== 'input' && completion.type !== 'input-choice') return false;
      return data !== undefined;
    };

    const close = <TReturn = unknown>(data?: TReturn): Promise<boolean> => {
      if (!shouldValidateClose(data)) {
        modal.close(data);
        return Promise.resolve(true);
      }

      const completion = activeCompletion.value!;
      return Promise.resolve(completion.validateInput!(String(data))).then((validation) => {
        if (!validation.valid) {
          completion.validationError = validation.message;
          return false;
        }

        completion.validationError = undefined;
        modal.close(data);
        return true;
      });
    };

    const closeAll = () => {
      modal.closeAll();
      openedCompletions.value = [];
    };

    const activeCompletion = computed(
      () => openedCompletions.value[openedCompletions.value.length - 1],
    );

    const isLoading = ref(false);

    const isSearchTargetActive = (target: SearchTarget): boolean =>
      activeCompletion.value === target.completion &&
      target.completion.searchQuery === target.query;

    const nextCandidate = () => {
      if (isNoCompletion.value) return;

      const completion = activeCompletion.value;
      if (isNullable(completion?.total)) return;

      if (isNullable(completion.selectedCandidateIndex)) {
        completion.selectedCandidateIndex = 1;
        return;
      }

      const isLastIndex = completion.selectedCandidateIndex === completion.total - 1;

      if (isLastIndex) {
        completion.selectedCandidateIndex = 0;
        return;
      }
      completion.selectedCandidateIndex++;
    };

    const previousCandidate = () => {
      if (isNoCompletion.value) return;

      const completion = activeCompletion.value;
      if (isNullable(completion?.total)) return;

      if (isNullable(completion.selectedCandidateIndex)) {
        completion.selectedCandidateIndex = completion.total - 1;
        return;
      }

      const isFirstIndex = completion.selectedCandidateIndex === 0;

      if (isFirstIndex) {
        completion.selectedCandidateIndex = completion.total - 1;
        return;
      }
      completion.selectedCandidateIndex--;
    };

    const isNoCompletion = computed(
      () => !activeCompletion.value || isNullable(activeCompletion.value.total),
    );

    const getSelectedCandidate = (): CompletionCandidate | undefined => {
      const completion = activeCompletion.value;
      if (!completion) return;
      const selectedIndex = completion.selectedCandidateIndex ?? 0;
      return completion.candidates?.[selectedIndex];
    };

    const getSelectedCandidateTitle = (): string | undefined => {
      const title = toValue(getSelectedCandidate()?.title);
      return typeof title === 'string' ? title : undefined;
    };

    const isAutocompleteMatch = (searchQuery: string, title: string): boolean => {
      if (!searchQuery) return true;
      return title.toLowerCase().startsWith(searchQuery.toLowerCase());
    };

    const canAcceptAutocomplete = (): boolean => {
      const completion = activeCompletion.value;
      const title = getSelectedCandidateTitle();
      if (completion?.type !== 'input-choice' || title === undefined) return false;
      return isAutocompleteMatch(completion.searchQuery, title);
    };

    const acceptAutocomplete = (): void => {
      const completion = activeCompletion.value;
      if (completion?.type !== 'input-choice') return;
      const title = getSelectedCandidateTitle();
      if (title === undefined || !isAutocompleteMatch(completion.searchQuery, title)) return;
      completion.searchQuery = title;
    };

    const performSearch = async (limit?: number, offset: number = 0): Promise<void> => {
      const completion = activeCompletion.value;
      if (!completion || completion.type === 'input') return;

      const { config } = useConfigStore();
      const searchLimit = limit ?? config.completion.defaultCompletionLimit;
      const target: SearchTarget = { completion, query: completion.searchQuery };
      isLoading.value = true;

      const result = await to(async () => {
        const searchResult = await completion.itemsGetter(target.query, searchLimit, offset);
        if (!isSearchTargetActive(target)) return;
        await setupCandidates(searchResult, offset, searchLimit, target);
      })();
      if (isSearchTargetActive(target)) isLoading.value = false;
      if (result.isErr()) throw result.error;
    };

    const applyInterceptors = async (
      candidates: CompletionCandidate[],
      completionName: string,
      searchQuery: string,
    ): Promise<CompletionCandidate[]> => {
      const matchingInterceptors = interceptors.value.filter((i) =>
        interceptorMatchesTarget(i.target, completionName),
      );
      const sortedInterceptors = sortInterceptorsByPriority(matchingInterceptors);
      const context: CompletionInterceptorContext = { completionName, searchQuery };

      return await sortedInterceptors.reduce(
        async (prev, interceptor) => interceptor.handler(await prev, context),
        Promise.resolve(candidates),
      );
    };

    const setupCandidates = async (
      r: CompletionSearchResult,
      offset: number,
      limit: number,
      target: SearchTarget,
    ): Promise<void> => {
      if (!isSearchTargetActive(target)) return;
      const completionName = target.completion.name ?? '';
      const processedCandidates = await applyInterceptors(r.result, completionName, target.query);

      if (!isSearchTargetActive(target)) return;
      const completion = target.completion;
      applyCandidateUpdate(completion, {
        result: r,
        candidates: processedCandidates,
        offset,
        limit,
      });
    };

    const runDebouncedSearch = async (): Promise<void> => {
      const result = await to(performSearch)();
      if (result.isErr()) reportSearchFailure(result.error);
    };

    const debouncedSearch = debounce(runDebouncedSearch, DEFAULT_INPUT_DEBOUNCE, { leading: true });
    const search = performSearch;

    watch(
      () => activeCompletion.value?.searchQuery,
      () => {
        if (activeCompletion.value) {
          activeCompletion.value.validationError = undefined;
        }
        debouncedSearch();
      },
    );

    const registerInterceptor = <T = unknown>(
      interceptor: CompletionInterceptor<T>,
    ): (() => void) => {
      interceptors.value = [...interceptors.value, interceptor as CompletionInterceptor<unknown>];
      return () => {
        interceptors.value = interceptors.value.filter((i) => i !== interceptor);
      };
    };

    const store: CompletionStore = {
      restore,
      close,
      closeAll,
      open,
      activeCompletion,
      nextCandidate,
      previousCandidate,
      canAcceptAutocomplete,
      acceptAutocomplete,
      search,
      registerInterceptor,
      isLoading,
    };

    return store;
  },
);
