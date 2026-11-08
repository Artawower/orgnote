<template>
  <agenda-entry-row
    :data="task"
    :checked="isChecked"
    :priority="task.priority"
    @toggle="onCheckboxChange"
  >
    <org-inline-editor
      v-if="isTitleEditorVisible"
      ref="titleInputRef"
      v-model="localTitle"
      :single-line="true"
      :readonly="false"
      class="title-editor"
      @submit="onTitleSubmit"
      @blur="onTitleSubmit"
    />
    <div v-else class="task-title" :class="{ done: isChecked }" @click.stop="onTitleClick">
      {{ task.text }}
    </div>

    <template #right>
      <app-flex row align-center gap="xs" class="task-meta" @click.stop>
        <agenda-schedule-button
          v-model="localSchedule"
          :show-habit-toggle="false"
          class="date-picker"
        />
        <action-button
          icon="sym_o_expand_more"
          size="sm"
          class="expand-btn"
          :class="{ 'expand-btn--open': props.expanded }"
          :aria-label="t(i18nKeys.orgAgendaQuickAddBodyPlaceholder)"
          @click="$emit('edit-expand')"
        />
      </app-flex>
    </template>
  </agenda-entry-row>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AppFlex from 'src/components/AppFlex.vue';
import AgendaScheduleButton from './AgendaScheduleButton.vue';
import OrgInlineEditor from 'src/components/OrgInlineEditor.vue';
import ActionButton from 'src/components/ActionButton.vue';
import AgendaEntryRow from './AgendaEntryRow.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import {
  extractPriorityFromTitle,
  removePriorityFromTitle,
} from 'src/utils/org-editor/org-title-parser';
import { buildTaskEditorTitle } from 'src/utils/org-editor/build-task-title';
import { api } from 'src/boot/api';

import type { AgendaTaskView } from '../composables/use-agenda-tasks';
import type { AgendaScheduleDraft } from '../types';
import { getActiveDate, hasRepeater, isCompletedOn } from '../utils/agenda-filters';

const props = defineProps<{ task: AgendaTaskView; expanded?: boolean }>();
const emit = defineEmits<{
  toggle: [];
  'edit-title': [newTitle: string];
  'edit-priority': [priority: string | undefined];
  'edit-tags': [tags: string[]];
  'edit-scheduled': [schedule: AgendaScheduleDraft | undefined];
  'edit-expand': [];
  'open-task': [];
}>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const { tabletBelow } = api.ui.useScreenDetection();

const localTitle = ref(buildTaskEditorTitle(props.task.text, props.task.priority));
const isEditingTitle = ref(false);
const titleInputRef = ref<InstanceType<typeof OrgInlineEditor> | null>(null);
const taskSchedule = (): AgendaScheduleDraft | undefined => {
  const date = getActiveDate(props.task);
  if (!date) return undefined;
  return {
    date,
    repeater: props.task.scheduled?.repeater,
    warning: props.task.scheduled?.warning,
  };
};

const localSchedule = ref<AgendaScheduleDraft | undefined>(taskSchedule());

watch(
  () => props.task.scheduled,
  () => {
    localSchedule.value = taskSchedule();
  },
);

watch(
  localSchedule,
  (schedule) => {
    if (JSON.stringify(schedule) === JSON.stringify(taskSchedule())) return;
    emit('edit-scheduled', schedule);
  },
  { deep: true },
);

watch(
  () => [props.task.text, props.task.priority] as const,
  ([text, priority]) => {
    localTitle.value = buildTaskEditorTitle(text, priority);
  },
);

const isChecked = computed(
  () =>
    props.task.state === 'done' ||
    (hasRepeater(props.task) && isCompletedOn(props.task, props.task.viewDate)),
);

const isTitleEditorVisible = computed(() => !tabletBelow.value && isEditingTitle.value);

const onCheckboxChange = (): void => emit('toggle');

const onTitleClick = async (): Promise<void> => {
  if (tabletBelow.value) {
    emit('open-task');
    return;
  }
  isEditingTitle.value = true;
  await nextTick();
  titleInputRef.value?.focus();
};

const onTitleSubmit = (): void => {
  const trimmed = localTitle.value.trim();
  const cleanTitle = removePriorityFromTitle(trimmed);
  const extractedPriority = extractPriorityFromTitle(trimmed)?.letter;

  if (cleanTitle && cleanTitle !== props.task.text) emit('edit-title', cleanTitle);
  if (extractedPriority !== props.task.priority) emit('edit-priority', extractedPriority);
  isEditingTitle.value = false;
};
</script>

<style lang="scss" scoped>
.title-editor {
  flex: 1;
  min-width: 0;
  line-height: inherit;

  :deep(.cm-editor) {
    height: 1lh;
    min-height: 0;
    line-height: inherit;
    outline: none;
  }

  :deep(.cm-scroller) {
    overflow: hidden;
    line-height: inherit;
  }

  :deep(.cm-content) {
    min-height: 0;
    padding: 0;
    line-height: inherit;
    text-decoration: v-bind("isChecked ? 'line-through' : 'none'");
    color: v-bind("isChecked ? 'var(--fg-muted)' : 'inherit'");
  }

  :deep(.cm-line) {
    @include overflow-ellipsis;

    padding: 0;
    line-height: inherit;
  }
}

.task-title {
  @include overflow-ellipsis;

  flex: 1;
  min-width: 0;
  cursor: text;

  &.done {
    color: var(--fg-muted);
    text-decoration: line-through;
  }
}

.expand-btn {
  :deep(.icon) {
    transition: transform 0.2s ease;
  }
}

.expand-btn--open {
  :deep(.icon) {
    transform: rotate(180deg);
  }
}

.task-meta {
  @include fontify(var(--font-size-sm), normal, var(--fg-muted));
}
</style>
