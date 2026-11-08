<template>
  <app-buffer-content constrained no-padding-bottom>
    <container-layout class="agenda-buffer" :body-scroll="false" gap="sm">
      <template #header>
        <app-flex column align-stretch gap="sm">
          <agenda-quick-add-container :date-filter="dateFilter" />
          <agenda-task-query-bar
            :date-filter="dateFilter"
            :result-count="filteredTaskCount"
            @select-date="selectDate"
          />
        </app-flex>
      </template>
      <template #body>
        <app-flex column start align-stretch gap="sm" class="body-content">
          <loading-dots v-if="loading" />
          <empty-state
            v-else-if="!groups.length"
            icon="sym_o_checklist"
            :title="t(extensionI18nKeys.orgAgendaNoTasksTitle)"
            :description="t(extensionI18nKeys.orgAgendaNoTasksDescription)"
          />
          <q-virtual-scroll
            v-else
            ref="virtualScroll"
            :items="groups"
            :virtual-scroll-item-size="AGENDA_GROUP_ITEM_SIZE"
            :virtual-scroll-slice-size="AGENDA_GROUP_SLICE_SIZE"
            class="groups-scroll"
            v-slot="{ item: group }"
            @virtual-scroll="onVirtualScroll"
          >
            <div class="group-item">
              <agenda-task-group
                :key="group.filePath"
                :group="group"
                :expanded="isGroupExpanded(group.filePath)"
                :expanded-task-id="expandedTaskId(group.filePath)"
                @update:expanded="setGroupExpanded(group.filePath, $event)"
                @update:expanded-task-id="setExpandedTaskId(group.filePath, $event)"
                @task-toggle="toggleTask"
                @task-edit-title="editTaskTitle"
                @task-edit-priority="editTaskPriority"
                @task-edit-tags="editTaskTags"
                @task-edit-scheduled="editTaskScheduled"
                @task-edit-save="editTaskSave"
              />
            </div>
          </q-virtual-scroll>
        </app-flex>
      </template>
    </container-layout>
  </app-buffer-content>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type {
  Buffer as OrgBuffer,
  BufferViewStateHandle,
} from 'orgnote-api';
import { textToUint8Array, to, uint8ArrayToText } from 'orgnote-api/utils';
import AppFlex from 'src/components/AppFlex.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import EmptyState from 'src/components/EmptyState.vue';
import LoadingDots from 'src/components/LoadingDots.vue';
import AppBufferContent from 'src/components/AppBufferContent.vue';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import AgendaTaskGroup from './components/AgendaTaskGroup.vue';
import AgendaTaskQueryBar from './components/AgendaTaskQueryBar.vue';
import { useAgendaTasks } from './composables/use-agenda-tasks';
import type { AgendaTaskView } from './composables/use-agenda-tasks';
import { completeTask } from './mutations/complete-task';
import { completeRepeatingTask } from './mutations/complete-repeating-task';
import { reopenTask } from './mutations/reopen-task';
import { undoRecurringCompletion } from './mutations/undo-recurring-completion';
import { useI18n } from 'vue-i18n';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';
import { hasRepeater, isCompletedOn } from './utils/agenda-filters';
import AgendaQuickAddContainer from './containers/AgendaQuickAddContainer.vue';
import { changeTaskTitle } from './mutations/task-title';
import { changeTaskPriority } from './mutations/task-priority';
import { changeTaskTags } from './mutations/task-tags';
import { changeTaskScheduled } from './mutations/task-scheduled';
import { changeTaskBody } from './mutations/task-body';
import type { AgendaScheduleDraft, AgendaTaskDraft } from './types';
import type { AgendaDateFilter } from './models/agenda-task-query';
import type { DatePickerSelection } from 'src/models/date-picker';
import { createAgendaDateFilter } from './utils/agenda-date-selection';
import { parseAgendaTaskBufferUri } from './utils/agenda-task-buffer-uri';
import { showAgendaTaskBuffer } from './services/show-agenda-task-buffer';
import {
  extractPriorityFromTitle,
  removePriorityFromTitle,
} from 'src/utils/org-editor/org-title-parser';
import {
  useAgendaTasksViewState,
  type AgendaTasksViewState,
} from './composables/use-agenda-tasks-view-state';

const DEFAULT_DATE_FILTER: AgendaDateFilter = { kind: 'preset', value: 'all' };
const props = defineProps<{
  buffer: OrgBuffer;
  viewState?: BufferViewStateHandle<AgendaTasksViewState>;
}>();
const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const dateFilter = computed(
  () => parseAgendaTaskBufferUri(props.buffer.uri) ?? DEFAULT_DATE_FILTER,
);
const { loading, groups, filteredTaskCount } = useAgendaTasks(dateFilter);
const {
  virtualScroll,
  isGroupExpanded,
  setGroupExpanded,
  expandedTaskId,
  setExpandedTaskId,
  onVirtualScroll,
} = useAgendaTasksViewState({
  groupsGetter: () => groups.value,
  viewStateGetter: () => props.viewState,
});
const selectDate = async (selection: DatePickerSelection): Promise<void> => {
  await showAgendaTaskBuffer(api, createAgendaDateFilter(selection));
};
const fileContent = api.core.useFileContent();
const AGENDA_GROUP_ITEM_SIZE = 128;
const AGENDA_GROUP_SLICE_SIZE = 12;

const isSameLocalDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const resolveCompletedAt = (viewDate: Date): Date => {
  const now = new Date();
  return isSameLocalDay(viewDate, now) ? now : viewDate;
};

const findDoneDateForView = (task: AgendaTaskView): string | undefined =>
  task.doneDates?.find((doneDate) =>
    isCompletedOn({ ...task, doneDates: [doneDate] }, task.viewDate),
  );

const applyToggle = (task: AgendaTaskView, content: string): string => {
  if (task.start === undefined) return content;
  const completedAt = resolveCompletedAt(task.viewDate);
  const completedOnViewDate = isCompletedOn(task, task.viewDate);
  const doneDate = findDoneDateForView(task);
  if (completedOnViewDate && hasRepeater(task) && doneDate) {
    return undoRecurringCompletion(content, task.start, doneDate);
  }
  if (task.state === 'done') return reopenTask(content, task.start);
  if (hasRepeater(task)) return completeRepeatingTask(content, task.start, completedAt);
  return completeTask(content, task.start, completedAt);
};

const toggleTask = async (task: AgendaTaskView, filePath: string): Promise<void> => {
  if (task.start === undefined) return;
  const readResult = await to(fileContent.read, 'Failed to read file')(filePath);
  if (readResult.isErr()) {
    reporter.reportError(readResult.error);
    return;
  }
  const content = uint8ArrayToText(readResult.value);
  const nextContent = to(applyToggle, 'Failed to apply agenda mutation')(task, content);
  if (nextContent.isErr()) {
    reporter.reportError(nextContent.error);
    return;
  }
  if (nextContent.value === content) return;
  const writeResult = await to(fileContent.write, 'Failed to write file')(
    filePath,
    textToUint8Array(nextContent.value),
  );
  if (writeResult.isErr()) reporter.reportError(writeResult.error);
};

const applyTaskMutation = async (
  task: AgendaTaskView,
  filePath: string,
  mutation: (content: string) => string,
): Promise<void> => {
  if (task.start === undefined) return;
  const readResult = await to(fileContent.read, 'Failed to read file')(filePath);
  if (readResult.isErr()) {
    reporter.reportError(readResult.error);
    return;
  }
  const next = mutation(uint8ArrayToText(readResult.value));
  const writeResult = await to(fileContent.write, 'Failed to write file')(
    filePath,
    textToUint8Array(next),
  );
  if (writeResult.isErr()) reporter.reportError(writeResult.error);
};

const editTaskTitle = (task: AgendaTaskView, filePath: string, title: string): Promise<void> =>
  applyTaskMutation(task, filePath, (c) => changeTaskTitle(c, task.start!, title));

const editTaskPriority = (
  task: AgendaTaskView,
  filePath: string,
  priority: string | undefined,
): Promise<void> =>
  applyTaskMutation(task, filePath, (c) => changeTaskPriority(c, task.start!, priority));

const editTaskTags = (task: AgendaTaskView, filePath: string, tags: string[]): Promise<void> =>
  applyTaskMutation(task, filePath, (c) => changeTaskTags(c, task.start!, tags));

const editTaskScheduled = (
  task: AgendaTaskView,
  filePath: string,
  schedule: AgendaScheduleDraft | undefined,
): Promise<void> =>
  applyTaskMutation(task, filePath, (c) => changeTaskScheduled(c, task.start!, schedule));

const editTaskSave = async (
  task: AgendaTaskView,
  filePath: string,
  draft: AgendaTaskDraft,
): Promise<void> => {
  const cleanTitle = removePriorityFromTitle(draft.title);
  const priority = extractPriorityFromTitle(draft.title)?.letter;
  const mutations: Array<(c: string) => string> = [];

  if (cleanTitle && cleanTitle !== task.text)
    mutations.push((c) => changeTaskTitle(c, task.start!, cleanTitle));
  if (priority !== task.priority)
    mutations.push((c) => changeTaskPriority(c, task.start!, priority));
  if (JSON.stringify(draft.scheduled) !== JSON.stringify(task.scheduled))
    mutations.push((c) => changeTaskScheduled(c, task.start!, draft.scheduled));
  if (draft.body.trim()) mutations.push((c) => changeTaskBody(c, task.start!, draft.body));

  if (!mutations.length) return;
  await applyTaskMutation(task, filePath, (c) => mutations.reduce((acc, fn) => fn(acc), c));
};
</script>

<style lang="scss" scoped>
.agenda-buffer {
  @include fit;
  box-sizing: border-box;
  padding: var(--editor-padding);

  @include tablet-below {
    padding-bottom: 0;
  }
}

.body-content {
  height: 100%;
  min-height: 0;

  @include tablet-below {
    padding-bottom: var(--floating-padding-bottom);
  }
}

.groups-scroll {
  height: 100%;
  min-height: 0;
}

.group-item {
  padding-bottom: var(--gap-sm);
}
</style>
