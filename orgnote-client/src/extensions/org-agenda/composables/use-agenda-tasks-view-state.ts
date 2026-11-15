import type { BufferViewStateHandle } from 'orgnote-api';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import type { AgendaTaskGroup } from './use-agenda-tasks';
import { buildAgendaTaskRows, type AgendaTaskListRow } from '../utils/agenda-task-rows';

export type AgendaTasksScrollAnchor = {
  readonly rowKey?: string;
  readonly filePath?: string;
  readonly fallbackIndex: number;
};

export type AgendaTasksViewState = {
  readonly scrollAnchor?: AgendaTasksScrollAnchor;
  readonly collapsedFilePaths: readonly string[];
  readonly expandedTaskByFilePath: Readonly<Record<string, string>>;
};

export interface AgendaTasksScrollTarget {
  scrollToIndex(index: number, align: 'start'): void;
}

interface UseAgendaTasksViewStateOptions {
  readonly groupsGetter: () => readonly AgendaTaskGroup[];
  readonly viewStateGetter: () => BufferViewStateHandle<AgendaTasksViewState> | undefined;
}

interface AgendaTasksSelectionState {
  readonly collapsedFilePaths: Ref<string[]>;
  readonly expandedTaskByFilePath: Ref<Record<string, string>>;
}

interface AgendaTasksScrollState {
  readonly virtualScroll: Ref<AgendaTasksScrollTarget | null>;
  readonly anchor: Ref<AgendaTasksScrollAnchor | undefined>;
  readonly pendingAnchor: Ref<AgendaTasksScrollAnchor | undefined>;
}

interface AgendaTasksViewStateContext {
  readonly options: UseAgendaTasksViewStateOptions;
  readonly rows: ComputedRef<AgendaTaskListRow[]>;
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
  virtualScroll: ref<AgendaTasksScrollTarget | null>(null),
  anchor: ref(initialState?.scrollAnchor),
  pendingAnchor: ref(initialState?.scrollAnchor ?? DEFAULT_SCROLL_ANCHOR),
});

const resolveScrollIndex = (
  rows: readonly AgendaTaskListRow[],
  anchor: AgendaTasksScrollAnchor,
): number => {
  const rowIndex = anchor.rowKey ? rows.findIndex(({ key }) => key === anchor.rowKey) : -1;
  if (rowIndex >= 0) return rowIndex;
  const fileIndex = rows.findIndex(({ filePath }) => filePath === anchor.filePath);
  if (fileIndex >= 0) return fileIndex;
  return Math.min(Math.max(anchor.fallbackIndex, 0), rows.length - 1);
};

const restorePendingScroll = async (context: AgendaTasksViewStateContext): Promise<void> => {
  const anchor = context.scroll.pendingAnchor.value;
  if (!anchor) return;
  await nextTick();
  const scroll = context.scroll.virtualScroll.value;
  const rows = context.rows.value;
  if (!scroll || !rows.length || context.scroll.pendingAnchor.value !== anchor) return;
  scroll.scrollToIndex(resolveScrollIndex(rows, anchor), 'start');
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
    [context.rows, context.scroll.virtualScroll],
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
  const row = context.rows.value[index];
  context.scroll.anchor.value = {
    rowKey: row?.key,
    filePath: row?.filePath,
    fallbackIndex: index,
  };
};

const isGroupExpandedIn =
  (selection: AgendaTasksSelectionState) =>
  (filePath: string): boolean =>
    !selection.collapsedFilePaths.value.includes(filePath);

const isExpandedTaskRow = (selection: AgendaTasksSelectionState, row: AgendaTaskListRow): boolean =>
  row.kind === 'task' && selection.expandedTaskByFilePath.value[row.filePath] === row.task.id;

const collectPinnedRowIndexes = (
  rows: readonly AgendaTaskListRow[],
  isPinned: (row: AgendaTaskListRow) => boolean,
): number[] => rows.flatMap((row, index) => (isPinned(row) ? [index] : []));

const toggleRowKey = (keys: ReadonlySet<string>, rowKey: string, isIncluded: boolean): Set<string> => {
  const nextKeys = new Set(keys);
  if (isIncluded) nextKeys.add(rowKey);
  else nextKeys.delete(rowKey);
  return nextKeys;
};

export const useAgendaTasksViewState = (options: UseAgendaTasksViewStateOptions) => {
  const initialState = options.viewStateGetter()?.get();
  const selection = createSelectionState(initialState);
  const isGroupExpanded = isGroupExpandedIn(selection);
  const rows = computed(() => buildAgendaTaskRows(options.groupsGetter(), isGroupExpanded));
  const context: AgendaTasksViewStateContext = {
    options,
    rows,
    selection,
    scroll: createScrollState(initialState),
  };
  const titleEditingRowKeys = shallowRef<ReadonlySet<string>>(new Set());
  const isPinnedRow = (row: AgendaTaskListRow): boolean =>
    isExpandedTaskRow(selection, row) || titleEditingRowKeys.value.has(row.key);
  setupViewStateLifecycle(context);

  return {
    rows,
    pinnedRowIndexes: computed(() => collectPinnedRowIndexes(rows.value, isPinnedRow)),
    setTitleEditing: (rowKey: string, isEditing: boolean) => {
      titleEditingRowKeys.value = toggleRowKey(titleEditingRowKeys.value, rowKey, isEditing);
    },
    virtualScroll: context.scroll.virtualScroll,
    isGroupExpanded,
    setGroupExpanded: (filePath: string, isExpanded: boolean) =>
      setGroupExpanded(context.selection, filePath, isExpanded),
    expandedTaskId: (filePath: string) =>
      context.selection.expandedTaskByFilePath.value[filePath],
    setExpandedTaskId: (filePath: string, taskId: string | null) =>
      setExpandedTaskId(context.selection, filePath, taskId),
    onVisibleRange: ({ start }: { readonly start: number }) => recordScrollAnchor(context, start),
  };
};
