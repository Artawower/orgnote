<template>
  <agenda-entry-row
    :data="habit"
    :checked="completedOnDay"
    :priority="habit.priority"
    :toggle-label="toggleLabel"
    @toggle="emit('toggle')"
  >
    <app-flex column start align-start class="habit-body" gap="xs">
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
      <overflow-line v-else class="habit-title" @click.stop="onTitleClick">{{
        habit.text
      }}</overflow-line>
      <app-flex row align-center gap="sm" class="habit-stats">
        <span class="stat-item stat-total"
          >⚡ {{ t(i18nKeys.orgAgendaHabitsTotalDays, { count: habit.totalDays }) }}</span
        >
        <span class="stat-item stat-streak"
          >🔥 {{ t(i18nKeys.orgAgendaHabitsCurrentStreak, { count: habit.currentStreak }) }}</span
        >
      </app-flex>
    </app-flex>
  </agenda-entry-row>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { todayIsoDate } from 'src/utils/org-date';
import AppFlex from 'src/components/AppFlex.vue';
import AgendaEntryRow from './AgendaEntryRow.vue';
import OverflowLine from 'src/components/OverflowLine.vue';
import OrgInlineEditor from 'src/components/OrgInlineEditor.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { clockMatchesDate } from '../composables/use-habits';
import { buildTaskEditorTitle } from 'src/utils/org-editor/build-task-title';
import {
  extractPriorityFromTitle,
  removePriorityFromTitle,
} from 'src/utils/org-editor/org-title-parser';
import { api } from 'src/boot/api';
import type { AgendaHabitView } from '../types';

const props = defineProps<{ habit: AgendaHabitView; selectedDate: string }>();
const emit = defineEmits<{
  toggle: [];
  'edit-title': [newTitle: string];
  'edit-priority': [priority: string | undefined];
  'open-habit': [];
}>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const { tabletBelow } = api.ui.useScreenDetection();

const localTitle = ref(buildTaskEditorTitle(props.habit.text, props.habit.priority));
const isEditingTitle = ref(false);
const titleInputRef = ref<InstanceType<typeof OrgInlineEditor> | null>(null);

watch(
  () => [props.habit.text, props.habit.priority] as const,
  ([text, priority]) => {
    localTitle.value = buildTaskEditorTitle(text, priority);
  },
);

const completedOnDay = computed(() => clockMatchesDate(props.habit, props.selectedDate));

const isToday = computed(() => props.selectedDate === todayIsoDate());

const isTitleEditorVisible = computed(() => !tabletBelow.value && isEditingTitle.value);

const toggleLabel = computed(() => {
  if (completedOnDay.value) {
    return t(isToday.value ? i18nKeys.orgAgendaHabitsCompletedToday : i18nKeys.orgAgendaHabitsDone);
  }
  return t(
    isToday.value ? i18nKeys.orgAgendaHabitsCompleteToday : i18nKeys.orgAgendaHabitsMarkDone,
  );
});

const onTitleClick = async (): Promise<void> => {
  if (tabletBelow.value) {
    emit('open-habit');
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

  if (cleanTitle && cleanTitle !== props.habit.text) emit('edit-title', cleanTitle);
  if (extractedPriority !== props.habit.priority) emit('edit-priority', extractedPriority);
  isEditingTitle.value = false;
};
</script>

<style lang="scss" scoped>
.habit-body {
  flex: 1;
  min-width: 0;
}

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
  }

  :deep(.cm-line) {
    @include overflow-ellipsis;

    padding: 0;
    line-height: inherit;
  }
}

.habit-title {
  font-size: var(--font-size-md);
  color: var(--fg);
}

.habit-stats {
  gap: var(--gap-sm);
}

.stat-item {
  font-size: var(--font-size-xs);
  color: var(--fg-muted);
}

.stat-total {
  color: var(--yellow);
}

.stat-streak {
  color: var(--red);
}
</style>
