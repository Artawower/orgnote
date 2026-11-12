<template>
  <div class="task-item" :class="{ expanded }">
    <agenda-task-row
      :task="task"
      :expanded="expanded"
      @toggle="$emit('task-toggle', task, filePath)"
      @edit-title="(title) => $emit('task-edit-title', task, filePath, title)"
      @edit-priority="(priority) => $emit('task-edit-priority', task, filePath, priority)"
      @edit-tags="(tags) => $emit('task-edit-tags', task, filePath, tags)"
      @edit-scheduled="(schedule) => $emit('task-edit-scheduled', task, filePath, schedule)"
      @open-task="onTaskOpen"
      @edit-expand="onEditExpand"
      @title-editing="(isEditing) => $emit('title-editing', isEditing)"
    />
    <div v-if="expanded" class="edit-form">
      <agenda-task-form
        v-model:title="editDraft.title"
        v-model:body="editDraft.body"
        :show-title-row="false"
        :hide-submit="true"
        @cancel="expanded = false"
        @body-blur="onBodyBlur"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useAgendaMiniEditor } from '../composables/use-agenda-mini-editor';
import AgendaTaskRow from './AgendaTaskRow.vue';
import AgendaTaskForm from './AgendaTaskForm.vue';
import type { AgendaTaskView } from '../composables/use-agenda-tasks';
import type { AgendaScheduleDraft, AgendaTaskDraft } from '../types';
import { buildTaskEditorTitle } from 'src/utils/org-editor/build-task-title';
import { api } from 'src/boot/api';
import { uint8ArrayToText, to, editOrgDocument } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';

const props = defineProps<{ task: AgendaTaskView; filePath: string }>();
const expanded = defineModel<boolean>('expanded', { default: false });
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
  'title-editing': [isEditing: boolean];
}>();

const { openEdit } = useAgendaMiniEditor();
const { tabletBelow } = api.ui.useScreenDetection();

const toScheduleDraft = ({ scheduled }: AgendaTaskView): AgendaScheduleDraft | undefined => {
  if (!scheduled) return;
  return {
    date: scheduled.date,
    to: scheduled.to,
    repeater: scheduled.repeater,
    warning: scheduled.warning,
  };
};

const createEditDraft = (task: AgendaTaskView): AgendaTaskDraft => ({
  title: buildTaskEditorTitle(task.text, task.priority),
  body: '',
  tags: [],
  priority: undefined,
  scheduled: toScheduleDraft(task),
  isHabit: task.isHabit ?? false,
});

const editDraft = ref<AgendaTaskDraft>(createEditDraft(props.task));

const loadTaskBody = async (task: AgendaTaskView): Promise<void> => {
  const headlineStart = task.start;
  if (headlineStart === undefined) return;
  const result = await to(api.core.useFileContent().read)(props.filePath);
  if (!expanded.value) return;
  if (result.isErr()) {
    reporter.reportError(result.error);
    return;
  }
  const content = uint8ArrayToText(result.value);
  editOrgDocument(content, (doc) => {
    editDraft.value = { ...editDraft.value, body: doc.headlineAt(headlineStart)?.body ?? '' };
  });
};

const openEditor = (isExpanded: boolean): void => {
  if (!isExpanded) return;
  editDraft.value = createEditDraft(props.task);
  void loadTaskBody(props.task);
};

watch(expanded, openEditor, { immediate: true, flush: 'sync' });

const onTaskOpen = (): void => {
  if (!tabletBelow.value) return;
  openEdit(props.task, props.filePath);
};

const onEditExpand = (): void => {
  if (tabletBelow.value) {
    openEdit(props.task, props.filePath);
    return;
  }
  expanded.value = !expanded.value;
};

const onBodyBlur = (): void => {
  emit('task-edit-save', props.task, props.filePath, { ...editDraft.value });
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
