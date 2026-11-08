<template>
  <app-spoiler v-model="groupExpanded" variant="flat">
    <template #title>
      <app-title :level="5" no-margin>{{ group.fileTitle }}</app-title>
    </template>
    <template #actions>
      <app-flex row end align-center gap="xs">
        <app-badge :label="String(group.tasks.length)" size="xs" />
        <command-action-button
          :command="AGENDA_QUICK_ADD_TO_FILE_COMMAND"
          :data="{ filePath: group.filePath }"
          :aria-label="t(extensionI18nKeys.orgAgendaQuickAddAddButton)"
          size="xs"
        />
        <command-action-button
          :command="DefaultCommands.OPEN_NOTE"
          :data="{ path: group.filePath }"
          :aria-label="t(extensionI18nKeys.orgAgendaOpenNote)"
          size="xs"
        />
      </app-flex>
    </template>
    <template #body>
      <menu-group>
        <div
          v-for="task in group.tasks"
          :key="task.id"
          class="task-item"
          :class="{ expanded: expandedTaskId === task.id }"
        >
          <agenda-task-row
            :task="task"
            :expanded="expandedTaskId === task.id"
            @toggle="onTaskToggle(task)"
            @edit-title="(title) => $emit('task-edit-title', task, group.filePath, title)"
            @edit-priority="(priority) => $emit('task-edit-priority', task, group.filePath, priority)"
            @edit-tags="(tags) => $emit('task-edit-tags', task, group.filePath, tags)"
            @edit-scheduled="(schedule) => $emit('task-edit-scheduled', task, group.filePath, schedule)"
            @open-task="onTaskOpen(task)"
            @edit-expand="onEditExpand(task)"
          />
          <div v-if="expandedTaskId === task.id" class="edit-form">
            <agenda-task-form
              v-model:title="editDraft.title"
              v-model:body="editDraft.body"
              :show-title-row="false"
              :hide-submit="true"
              @cancel="expandedTaskId = null"
              @body-blur="onBodyBlur(task)"
            />
          </div>
        </div>
      </menu-group>
    </template>
  </app-spoiler>
</template>

<script lang="ts" setup>
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAgendaMiniEditor } from '../composables/use-agenda-mini-editor';
import AppSpoiler from 'src/components/AppSpoiler.vue';
import AppTitle from 'src/components/AppTitle.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppBadge from 'src/components/AppBadge.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import AgendaTaskRow from './AgendaTaskRow.vue';
import AgendaTaskForm from './AgendaTaskForm.vue';
import type { AgendaTaskView } from '../composables/use-agenda-tasks';
import type { AgendaTaskGroup } from '../composables/use-agenda-tasks';
import type { AgendaScheduleDraft, AgendaTaskDraft } from '../types';
import { buildTaskEditorTitle } from 'src/utils/org-editor/build-task-title';
import { api } from 'src/boot/api';
import { uint8ArrayToText, to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { editOrgDocument } from 'orgnote-api/utils';
import { DefaultCommands } from 'orgnote-api';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';
import { AGENDA_QUICK_ADD_TO_FILE_COMMAND } from '../constants';

const props = defineProps<{ group: AgendaTaskGroup }>();
const groupExpanded = defineModel<boolean>('expanded', { default: true });
const expandedTaskId = defineModel<string | null>('expandedTaskId', { default: null });
const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const emit = defineEmits<{
  'task-toggle': [task: AgendaTaskView, filePath: string];
  'task-edit-title': [task: AgendaTaskView, filePath: string, title: string];
  'task-edit-priority': [task: AgendaTaskView, filePath: string, priority: string | undefined];
  'task-edit-tags': [task: AgendaTaskView, filePath: string, tags: string[]];
  'task-edit-scheduled': [
    task: AgendaTaskView,
    filePath: string,
    schedule: AgendaScheduleDraft | undefined,
  ];
  'task-edit-save': [task: AgendaTaskView, filePath: string, draft: AgendaTaskDraft];
}>();

const { openEdit } = useAgendaMiniEditor();
const { tabletBelow } = api.ui.useScreenDetection();

const onTaskOpen = (task: AgendaTaskView): void => {
  if (!tabletBelow.value) return;
  openEdit(task, props.group.filePath);
};

const editDraft = reactive<AgendaTaskDraft>({
  title: '',
  body: '',
  tags: [],
  priority: undefined,
  scheduled: undefined,
  isHabit: false,
});

const onTaskToggle = (task: AgendaTaskView): void => {
  emit('task-toggle', task, props.group.filePath);
};

const initializeEditDraft = (task: AgendaTaskView): void => {
  editDraft.title = buildTaskEditorTitle(task.text, task.priority);
  editDraft.body = '';
  editDraft.scheduled = task.scheduled
    ? {
        date: task.scheduled.date,
        to: task.scheduled.to,
        repeater: task.scheduled.repeater,
        warning: task.scheduled.warning,
      }
    : undefined;
  editDraft.isHabit = task.isHabit ?? false;
};

const loadTaskBody = async (task: AgendaTaskView, targetId: string): Promise<void> => {
  const headlineStart = task.start;
  if (headlineStart === undefined) return;
  const result = await to(api.core.useFileContent().read)(props.group.filePath);
  if (expandedTaskId.value !== targetId) return;
  if (result.isErr()) {
    reporter.reportError(result.error);
    return;
  }
  const content = uint8ArrayToText(result.value);
  editOrgDocument(content, (doc) => {
    editDraft.body = doc.headlineAt(headlineStart)?.body ?? '';
  });
};

const restoreExpandedTask = (taskId: string | null): void => {
  if (!taskId) return;
  const task = props.group.tasks.find(({ id }) => id === taskId);
  if (!task) {
    expandedTaskId.value = null;
    return;
  }
  initializeEditDraft(task);
  void loadTaskBody(task, taskId);
};

watch(expandedTaskId, restoreExpandedTask, { immediate: true, flush: 'sync' });

const onEditExpand = (task: AgendaTaskView): void => {
  if (tabletBelow.value) {
    openEdit(task, props.group.filePath);
    return;
  }
  expandedTaskId.value = expandedTaskId.value === task.id ? null : task.id;
};

const onBodyBlur = (task: AgendaTaskView): void => {
  emit('task-edit-save', task, props.group.filePath, { ...editDraft });
};
</script>

<style lang="scss" scoped>
.task-item {
  min-width: 0;
}

.task-item.expanded {
  background: var(--agenda-task-expanded-bg, var(--bg-muted));
  border-radius: var(--agenda-task-expanded-radius, var(--menu-item-active-radius));
}

.edit-form {
  box-sizing: border-box;
  padding: var(--agenda-task-editor-padding, var(--padding-md));
}
</style>
