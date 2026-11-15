<template>
  <app-flex class="agenda-sidebar" column start align-stretch gap="md">
    <agenda-tasks-filter
      class="agenda-filters"
      :model-value="activePreset"
      :selected-file-path="filterStore.selectedFilePath"
      :totals="tasksStore.totalByFilter"
      :files="fileFilters"
      @select="onFilterSelect"
      @select-file="onFileFilterSelect"
    />
    <agenda-views-nav @navigate="onViewNavigate" />
  </app-flex>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { DefaultCommands } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import AppFlex from 'src/components/AppFlex.vue';
import AgendaTasksFilter from './components/AgendaTasksFilter.vue';
import AgendaViewsNav from './components/AgendaViewsNav.vue';
import { useAgendaFilterStore } from './stores/agenda-filter-store';
import { useAgendaTasksStore } from './stores/agenda-tasks-store';
import {
  buildAgendaFileFilterOptions,
  type AgendaFilter,
} from './composables/use-agenda-tasks';
import {
  AGENDA_TASKS_TODAY_COMMAND,
  AGENDA_TASKS_TOMORROW_COMMAND,
  AGENDA_TASKS_NEXT7DAYS_COMMAND,
  AGENDA_TASKS_OVERDUE_COMMAND,
  AGENDA_TASKS_ALL_COMMAND,
  AGENDA_TASKS_FILE_FILTER_COMMAND,
} from './constants';
import { resolveAgendaTaskBufferPreset } from './utils/agenda-task-buffer-uri';

const filterStore = useAgendaFilterStore();
const tasksStore = useAgendaTasksStore();
const { activeBufferUri } = storeToRefs(api.core.usePane());
const activePreset = computed(() =>
  activeBufferUri.value ? resolveAgendaTaskBufferPreset(activeBufferUri.value) : undefined,
);
const fileFilters = computed(() => buildAgendaFileFilterOptions(tasksStore.agendaFiles));

onMounted(() => {
  void tasksStore.ensureLoaded();
});

const { tabletBelow } = api.ui.useScreenDetection();

const FILTER_COMMAND: Record<AgendaFilter, string> = {
  today: AGENDA_TASKS_TODAY_COMMAND,
  tomorrow: AGENDA_TASKS_TOMORROW_COMMAND,
  next7days: AGENDA_TASKS_NEXT7DAYS_COMMAND,
  overdue: AGENDA_TASKS_OVERDUE_COMMAND,
  all: AGENDA_TASKS_ALL_COMMAND,
};

const onViewNavigate = async (uri: string): Promise<void> => {
  const result = await to(() =>
    api.core.useCommands().execute(DefaultCommands.SHOW_OR_OPEN_BUFFER, { uri }),
  )();
  if (result.isErr()) {
    reporter.reportError(new Error('Failed to open agenda view', { cause: result.error }));
    return;
  }
  if (tabletBelow.value) {
    api.ui.useSidebar().close();
  }
};

const closeMobileSidebar = (): void => {
  if (tabletBelow.value) api.ui.useSidebar().close();
};

const onFilterSelect = async (filter: AgendaFilter): Promise<void> => {
  await api.core.useCommands().execute(FILTER_COMMAND[filter]);
  closeMobileSidebar();
};

const onFileFilterSelect = async (filePath?: string): Promise<void> => {
  await api.core.useCommands().execute(AGENDA_TASKS_FILE_FILTER_COMMAND, { filePath });
  closeMobileSidebar();
};
</script>

<style lang="scss" scoped>
.agenda-sidebar {
  @include fit;
  min-height: 0;
  padding: var(--padding-lg);
  padding-bottom: var(--scroll-bottom-padding, var(--padding-lg));
  overflow: hidden;
}

.agenda-filters {
  min-height: 0;
}
</style>
