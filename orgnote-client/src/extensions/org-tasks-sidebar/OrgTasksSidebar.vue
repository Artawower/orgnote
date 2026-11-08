<template>
  <app-flex class="org-tasks-sidebar" column start align-stretch gap="sm">
    <app-flex class="tasks-body" column start align-stretch gap="sm">
      <app-flex class="tasks-controls" column start align-stretch gap="sm">
        <app-dropdown
          v-model="selectedUpdatedAtFilter"
          :options="updatedAtFilterOptions"
          option-label="label"
          option-value="value"
          :clearable="false"
          :use-input="false"
          class="tasks-date-filter"
        />

        <app-flex class="tasks-filter" start align-center gap="sm">
          <app-checkbox v-model="includeCompletedTasks" />
          <span class="tasks-filter-label">
            {{ t(extensionI18nKeys.orgTasksSidebarShowCompletedTasks) }}
          </span>
        </app-flex>
      </app-flex>

      <div class="tasks-content">
        <div v-if="showEmptyState" class="tasks-empty">
          {{ t(extensionI18nKeys.orgTasksSidebarNoTasksFound) }}
        </div>
        <app-tree v-if="showTree" :nodes="nodes" :selected="selectedId">
          <template #node="{ node, toggle }">
            <app-flex
              class="task-node-row"
              :class="{ done: isTaskDone(node) }"
              start
              align-center
              gap="sm"
              @click="handleNodeClick(node, toggle)"
            >
              <app-checkbox
                v-if="isTaskNode(node)"
                :model-value="isTaskDone(node)"
                :disabled="isTaskToggleDisabled(node)"
                @change="() => handleTaskToggle(node)"
                @click.stop
              />
              <app-icon v-else-if="node.icon" :name="node.icon" size="xs" />
              <app-flex class="task-node-content" column start align-start>
                <span class="task-node-label">{{ resolveNodeLabel(node) }}</span>
              </app-flex>
            </app-flex>
          </template>
        </app-tree>
      </div>
    </app-flex>

    <app-flex class="tasks-footer" column start align-stretch>
      <tasks-sidebar-calendar
        v-if="isCalendarOpen"
        v-model="selectedUpdatedAtDate"
        :clear-label="t(extensionI18nKeys.orgTasksSidebarCalendarClearFilter)"
        :markers="calendarDateMarkers"
      />
      <app-flex
        class="tasks-calendar-toggle"
        row
        between
        align-center
        gap="sm"
        @click="toggleCalendar"
      >
        <span class="tasks-calendar-toggle-label">
          {{ t(extensionI18nKeys.orgTasksSidebarCalendarTitle) }}
        </span>
        <app-flex row end align-center gap="sm">
          <app-badge v-if="selectedUpdatedAtDateLabel" variant="accent" size="xs">
            {{ selectedUpdatedAtDateLabel }}
          </app-badge>
          <app-icon
            :name="isCalendarOpen ? 'sym_o_keyboard_arrow_down' : 'sym_o_keyboard_arrow_up'"
            size="sm"
            color="fg-muted"
            class="tasks-calendar-toggle-icon"
          />
        </app-flex>
      </app-flex>
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import { DefaultCommands, type FileMeta, type FileSystemChange } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { onUnmounted, ref, computed, watch } from 'vue';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';
import AppTree from 'src/components/AppTree.vue';
import AppIcon from 'src/components/AppIcon.vue';
import AppCheckbox from 'src/components/AppCheckbox.vue';
import AppBadge from 'src/components/AppBadge.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppDropdown from 'src/components/AppDropdown.vue';
import { storeToRefs } from 'pinia';
import { debounce } from 'src/utils/debounce';
import TasksSidebarCalendar from './TasksSidebarCalendar.vue';
import {
  buildTaskDateMarkers,
  buildTasksTree,
  type TaskTreeNode,
  type UpdatedAtFilter,
} from './task-tree';
import { isOrgTaskRelatedChange } from './refresh-trigger';
import { createTaskToggleRunner, type ToggleableTaskNode } from './task-toggle-runner';
import { useI18n } from 'vue-i18n';

interface UpdatedAtFilterOption {
  label: string;
  value: UpdatedAtFilter;
}

const fileWatchDebounceMs = 350;

const loading = ref(false);
const selectedId = ref<string | number>();
const nodes = ref<TaskTreeNode[]>([]);
const filesWithTasks = ref<FileMeta[]>([]);
const includeCompletedTasks = ref(true);
const selectedUpdatedAtDate = ref<string>();
const isCalendarOpen = ref(false);
const fileMeta = api.core.useFileMeta();
const commands = api.core.useCommands();
const rightSidebar = api.ui.useRightSidebar();
const fileSearch = api.core.useFileSearch();
const fileWatcher = api.core.useFileWatcher();
const fileContent = api.core.useFileContent();
const { tabletBelow } = api.ui.useScreenDetection();
const { opened } = storeToRefs(rightSidebar);
const { isIndexing } = storeToRefs(fileSearch);
const { t } = useI18n();

const togglingTaskIds = ref<Set<string>>(new Set());

let stopFileWatch: (() => void) | undefined;
const taskToggleRunner = createTaskToggleRunner({
  fileContent,
  fileSearch,
  loadTasks,
});

const showTree = computed(() => nodes.value.length > 0);
const showEmptyState = computed(() => !loading.value && nodes.value.length === 0);
const updatedAtFilterOptions = computed<UpdatedAtFilterOption[]>(() => {
  return [
    { value: 'all', label: t(extensionI18nKeys.orgTasksSidebarUpdatedAtFilterAll) },
    { value: 'today', label: t(extensionI18nKeys.orgTasksSidebarUpdatedAtFilterToday) },
    { value: 'yesterday', label: t(extensionI18nKeys.orgTasksSidebarUpdatedAtFilterYesterday) },
    { value: 'last-week', label: t(extensionI18nKeys.orgTasksSidebarUpdatedAtFilterLastWeek) },
    { value: 'last-month', label: t(extensionI18nKeys.orgTasksSidebarUpdatedAtFilterLastMonth) },
  ];
});

const selectedUpdatedAtFilter = ref<UpdatedAtFilterOption>(updatedAtFilterOptions.value[0]!);

const calendarDateMarkers = computed(() => {
  return buildTaskDateMarkers(filesWithTasks.value, {
    includeCompletedTasks: includeCompletedTasks.value,
    updatedAtFilter: selectedUpdatedAtFilter.value.value,
  });
});

const selectedUpdatedAtDateLabel = computed(() => {
  if (!selectedUpdatedAtDate.value) {
    return undefined;
  }

  return formatSelectedDateLabel(selectedUpdatedAtDate.value);
});

const rebuildTree = (): void => {
  nodes.value = buildTasksTree(filesWithTasks.value, {
    includeCompletedTasks: includeCompletedTasks.value,
    updatedAtFilter: selectedUpdatedAtFilter.value.value,
    selectedUpdatedAtDate: selectedUpdatedAtDate.value,
  });
};

const formatSelectedDateLabel = (value: string): string => {
  const [yearPart, monthPart, dayPart] = value.split('/').map(Number);
  const year = yearPart ?? 0;
  const month = monthPart ?? 1;
  const day = dayPart ?? 1;
  return new Date(year, month - 1, day).toLocaleDateString();
};

const toggleCalendar = (): void => {
  isCalendarOpen.value = !isCalendarOpen.value;
};

const isTaskNode = (node: TaskTreeNode): boolean => node.kind === 'task';
const isTaskDone = (node: TaskTreeNode): boolean => node.taskState === 'done';
const resolveNodeLabel = (node: TaskTreeNode): string => {
  if (node.kind !== 'task') {
    return node.label;
  }
  return node.label || t(extensionI18nKeys.orgTasksSidebarEmptyTaskLabel);
};

const isToggleableTaskNode = (node: TaskTreeNode): node is ToggleableTaskNode => {
  return (
    node.kind === 'task' &&
    typeof node.id === 'string' &&
    !!node.filePath &&
    !!node.taskKind &&
    typeof node.start === 'number'
  );
};

const isTaskToggleDisabled = (node: TaskTreeNode): boolean => {
  if (!isToggleableTaskNode(node)) {
    return true;
  }
  return loading.value || togglingTaskIds.value.has(node.id);
};

async function loadTasks(): Promise<void> {
  loading.value = true;
  const result = await to(() => fileMeta.getAll())();
  if (result.isErr()) {
    reporter.reportError(new Error('Failed to load tasks', { cause: result.error }));
    loading.value = false;
    return;
  }
  filesWithTasks.value = result.value;
  rebuildTree();
  loading.value = false;
}

const scheduleReloadTasks = debounce(() => {
  if (!opened.value) {
    return;
  }
  void loadTasks();
}, fileWatchDebounceMs);

const handleFileSystemChange = (change: FileSystemChange): void => {
  if (isIndexing.value) {
    return;
  }
  if (!isOrgTaskRelatedChange(change)) {
    return;
  }
  scheduleReloadTasks();
};

const startWatchingFileChanges = (): void => {
  if (stopFileWatch) {
    return;
  }
  stopFileWatch = fileWatcher.watch('/', handleFileSystemChange, { recursive: true });
};

const stopWatchingFileChanges = (): void => {
  stopFileWatch?.();
  stopFileWatch = undefined;
  scheduleReloadTasks.cancel();
};

const handleNodeClick = async (node: TaskTreeNode, toggle?: () => void): Promise<void> => {
  selectedId.value = node.id;
  if (!isTaskNode(node) || !node.filePath) {
    toggle?.();
    return;
  }
  const openResult = await to(() =>
    commands.execute(DefaultCommands.OPEN_NOTE, {
      path: node.filePath,
    }),
  )();

  if (openResult.isErr()) {
    reporter.reportError(new Error('Failed to open note', { cause: openResult.error }));
    return;
  }

  if (!tabletBelow.value) {
    return;
  }

  const closeResult = await to(() => rightSidebar.close())();
  if (closeResult.isErr()) {
    reporter.reportError(new Error('Failed to close right sidebar', { cause: closeResult.error }));
  }
};

const withTaskToggleLock = async (node: ToggleableTaskNode): Promise<void> => {
  togglingTaskIds.value = new Set(togglingTaskIds.value).add(node.id);
  const toggleResult = await to(() => taskToggleRunner.run(node), 'Failed to update task')();
  const nextIds = new Set(togglingTaskIds.value);

  nextIds.delete(node.id);
  togglingTaskIds.value = nextIds;

  if (toggleResult.isErr()) {
    reporter.reportError(toggleResult.error);
  }
};

const handleTaskToggle = async (node: TaskTreeNode): Promise<void> => {
  if (!isToggleableTaskNode(node) || isTaskToggleDisabled(node)) {
    return;
  }
  await withTaskToggleLock(node);
};

const reloadTasksIfOpened = (isOpen: boolean): void => {
  if (!isOpen) {
    stopWatchingFileChanges();
    return;
  }

  startWatchingFileChanges();
  void loadTasks();
};

const reloadTasksAfterIndexing = (isIndexingNow: boolean, wasIndexing: boolean): void => {
  if (isIndexingNow || !wasIndexing || !opened.value) {
    return;
  }
  void loadTasks();
};

watch(opened, reloadTasksIfOpened, { immediate: true });
watch(isIndexing, reloadTasksAfterIndexing);
watch(includeCompletedTasks, rebuildTree);
watch(selectedUpdatedAtFilter, rebuildTree);
watch(selectedUpdatedAtDate, rebuildTree);
watch(updatedAtFilterOptions, (options) => {
  const currentValue = selectedUpdatedAtFilter.value?.value;
  selectedUpdatedAtFilter.value =
    options.find((option) => option.value === currentValue) ?? options[0]!;
});

onUnmounted(stopWatchingFileChanges);
</script>

<style lang="scss" scoped>
.org-tasks-sidebar {
  @include fit;
  min-height: 0;
  padding: var(--padding-md);
  overflow: hidden;
}

.tasks-body {
  flex: 1;
  min-height: 0;
}

.tasks-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.tasks-empty {
  color: var(--fg-muted);
  text-align: center;
  width: 100%;
  padding: var(--padding-md);
}

.tasks-controls {
  margin-bottom: var(--margin-sm);
}

.tasks-filter {
  min-height: var(--menu-item-height-sm);
}

.tasks-filter-label {
  color: var(--fg-muted);
}

.tasks-date-filter {
  width: 100%;
}

.tasks-calendar-toggle {
  width: 100%;
  min-height: var(--menu-item-height-sm);
  padding: var(--padding-sm) 0;
  cursor: pointer;
}

.tasks-calendar-toggle-label {
  @include fontify(
    var(--font-size-md),
    var(--font-weight-medium),
    var(--fg),
    var(--line-height-normal)
  );
}

.task-node-row {
  @include interactive-no-select;
  width: 100%;
  min-height: var(--menu-item-height-sm);
  cursor: pointer;
}

.task-node-content {
  min-width: 0;
  flex: 1;
}

.task-node-label {
  @include line-limit(1);
}

.task-node-row.done .task-node-label {
  color: var(--fg-muted);
  text-decoration: line-through;
}
</style>
