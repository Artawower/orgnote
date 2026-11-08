import type { QVirtualScroll } from 'quasar';
import type { BufferViewStateHandle } from 'orgnote-api';
import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import type { AgendaTaskGroup } from './use-agenda-tasks';

export type AgendaTasksScrollAnchor = {
  readonly filePath?: string;
  readonly fallbackIndex: number;
};

export type AgendaTasksViewState = {
  readonly scrollAnchor?: AgendaTasksScrollAnchor;
  readonly collapsedFilePaths: readonly string[];
  readonly expandedTaskByFilePath: Readonly<Record<string, string>>;
};

interface UseAgendaTasksViewStateOptions {
  readonly groupsGetter: () => readonly AgendaTaskGroup[];
  readonly viewStateGetter: () => BufferViewStateHandle<AgendaTasksViewState> | undefined;
}

interface AgendaTasksSelectionState {
  readonly collapsedFilePaths: Ref<string[]>;
  readonly expandedTaskByFilePath: Ref<Record<string, string>>;
}

interface AgendaTasksScrollState {
  readonly virtualScroll: Ref<QVirtualScroll | null>;
  readonly anchor: Ref<AgendaTasksScrollAnchor | undefined>;
  readonly pendingAnchor: Ref<AgendaTasksScrollAnchor | undefined>;
}

interface AgendaTasksViewStateContext {
  readonly options: UseAgendaTasksViewStateOptions;
  readonly selection: AgendaTasksSelectionState;
  readonly scroll: AgendaTasksScrollState;
}

const DEFAULT_SCROLL_ANCHOR: AgendaTasksScrollAnchor = { fallbackIndex: 0 };

const createSelectionState = (
  initialState: AgendaTasksViewState | undefined,
): AgendaTasksSelectionState => ({
  collapsedFilePaths: ref([...(initialState?.collapsedFilePaths ?? [])]),
  expandedTaskByFilePath: ref({ ...initialState?.expandedTaskByFilePath }),
});

const createScrollState = (
  initialState: AgendaTasksViewState | undefined,
): AgendaTasksScrollState => ({
  virtualScroll: ref<QVirtualScroll | null>(null),
  anchor: ref(initialState?.scrollAnchor),
  pendingAnchor: ref(initialState?.scrollAnchor ?? DEFAULT_SCROLL_ANCHOR),
});

const resolveScrollIndex = (
  groups: readonly AgendaTaskGroup[],
  anchor: AgendaTasksScrollAnchor,
): number => {
  const anchoredIndex = groups.findIndex(({ filePath }) => filePath === anchor.filePath);
  if (anchoredIndex >= 0) return anchoredIndex;
  return Math.min(Math.max(anchor.fallbackIndex, 0), groups.length - 1);
};

const restorePendingScroll = async (context: AgendaTasksViewStateContext): Promise<void> => {
  const anchor = context.scroll.pendingAnchor.value;
  if (!anchor) return;
  await nextTick();
  const scroll = context.scroll.virtualScroll.value;
  const groups = context.options.groupsGetter();
  if (!scroll || !groups.length || context.scroll.pendingAnchor.value !== anchor) return;
  scroll.scrollTo(resolveScrollIndex(groups, anchor), 'start-force');
  context.scroll.pendingAnchor.value = undefined;
};

const captureViewState = (context: AgendaTasksViewStateContext): AgendaTasksViewState => ({
  ...(context.scroll.anchor.value
    ? { scrollAnchor: { ...context.scroll.anchor.value } }
    : {}),
  collapsedFilePaths: [...context.selection.collapsedFilePaths.value],
  expandedTaskByFilePath: { ...context.selection.expandedTaskByFilePath.value },
});

const restoreViewState = (
  context: AgendaTasksViewStateContext,
  state: AgendaTasksViewState | undefined,
): void => {
  context.scroll.anchor.value = state?.scrollAnchor;
  context.scroll.pendingAnchor.value = state?.scrollAnchor ?? DEFAULT_SCROLL_ANCHOR;
  context.selection.collapsedFilePaths.value = [...(state?.collapsedFilePaths ?? [])];
  context.selection.expandedTaskByFilePath.value = { ...state?.expandedTaskByFilePath };
  void restorePendingScroll(context);
};

const saveViewState = (
  context: AgendaTasksViewStateContext,
  handle: BufferViewStateHandle<AgendaTasksViewState> | undefined,
): void => {
  handle?.set(captureViewState(context));
};

const setupViewStateLifecycle = (context: AgendaTasksViewStateContext): void => {
  watch(context.options.viewStateGetter, (current, previous) => {
    saveViewState(context, previous);
    restoreViewState(context, current?.get());
  });
  watch(
    [context.options.groupsGetter, context.scroll.virtualScroll],
    () => void restorePendingScroll(context),
    { flush: 'post' },
  );
  onBeforeUnmount(() => saveViewState(context, context.options.viewStateGetter()));
};

const setGroupExpanded = (
  selection: AgendaTasksSelectionState,
  filePath: string,
  isExpanded: boolean,
): void => {
  selection.collapsedFilePaths.value = isExpanded
    ? selection.collapsedFilePaths.value.filter((path) => path !== filePath)
    : [...new Set([...selection.collapsedFilePaths.value, filePath])];
};

const setExpandedTaskId = (
  selection: AgendaTasksSelectionState,
  filePath: string,
  taskId: string | null,
): void => {
  selection.expandedTaskByFilePath.value = taskId
    ? { ...selection.expandedTaskByFilePath.value, [filePath]: taskId }
    : Object.fromEntries(
        Object.entries(selection.expandedTaskByFilePath.value).filter(([path]) => path !== filePath),
      );
};

const recordScrollAnchor = (context: AgendaTasksViewStateContext, index: number): void => {
  context.scroll.anchor.value = {
    filePath: context.options.groupsGetter()[index]?.filePath,
    fallbackIndex: index,
  };
};

export const useAgendaTasksViewState = (options: UseAgendaTasksViewStateOptions) => {
  const initialState = options.viewStateGetter()?.get();
  const context: AgendaTasksViewStateContext = {
    options,
    selection: createSelectionState(initialState),
    scroll: createScrollState(initialState),
  };
  setupViewStateLifecycle(context);

  return {
    virtualScroll: context.scroll.virtualScroll,
    isGroupExpanded: (filePath: string) =>
      !context.selection.collapsedFilePaths.value.includes(filePath),
    setGroupExpanded: (filePath: string, isExpanded: boolean) =>
      setGroupExpanded(context.selection, filePath, isExpanded),
    expandedTaskId: (filePath: string) =>
      context.selection.expandedTaskByFilePath.value[filePath],
    setExpandedTaskId: (filePath: string, taskId: string | null) =>
      setExpandedTaskId(context.selection, filePath, taskId),
    onVirtualScroll: ({ index }: { readonly index: number }) => recordScrollAnchor(context, index),
  };
};
