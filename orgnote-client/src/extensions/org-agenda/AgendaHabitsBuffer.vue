<template>
  <app-buffer-content constrained>
    <container-layout class="agenda-buffer" :body-scroll="true" gap="sm">
      <template #header>
        <app-flex column start align-stretch gap="sm">
          <agenda-habit-week-strip
            :week-days="weekDays"
            :selected-date="selectedDate"
            @select="selectDay"
          />
          <agenda-quick-add
            habit-mode
            :agenda-files-path="agendaConfig.agendaFilesPath ?? '/'"
            :inbox-file-path="resolvedInboxPath"
            :known-files="knownOrgFiles"
            :loading="quickAddLoading"
            @submit="submitQuickAdd"
          />
        </app-flex>
      </template>
      <template #body>
        <loading-dots v-if="loading" />
        <empty-state
          v-if="!loading && !habits.length"
          icon="sym_o_loop"
          :title="t(i18nKeys.orgAgendaHabitsEmptyTitle)"
          :description="t(i18nKeys.orgAgendaHabitsEmptySubtitle)"
        />
        <app-flex v-if="!loading && habits.length" column start align-stretch gap="sm">
          <card-wrapper v-for="habit in habits" :key="habit.id" class="habit-card">
            <agenda-habit-row
              :habit="habit"
              :selected-date="selectedDate"
              @toggle="onToggle(habit)"
              @edit-title="(title) => editHabitTitle(habit, title)"
              @edit-priority="(priority) => editHabitPriority(habit, priority)"
            />
          </card-wrapper>
        </app-flex>
      </template>
    </container-layout>
  </app-buffer-content>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';

import { textToUint8Array, to, uint8ArrayToText } from 'orgnote-api/utils';
import AppBufferContent from 'src/components/AppBufferContent.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import AppFlex from 'src/components/AppFlex.vue';
import CardWrapper from 'src/components/CardWrapper.vue';
import LoadingDots from 'src/components/LoadingDots.vue';
import EmptyState from 'src/components/EmptyState.vue';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import AgendaHabitWeekStrip from './components/AgendaHabitWeekStrip.vue';
import AgendaHabitRow from './components/AgendaHabitRow.vue';
import AgendaQuickAdd from './components/AgendaQuickAdd.vue';
import { clockMatchesDate, useHabits } from './composables/use-habits';
import { completeHabit } from './mutations/habit-complete';
import { addHabitClock } from './mutations/add-habit-clock';
import { removeHabitClock } from './mutations/remove-habit-clock';
import { changeTaskTitle } from './mutations/task-title';
import { changeTaskPriority } from './mutations/task-priority';
import { parseISO } from 'date-fns';
import type { AgendaHabitView } from './types';
import { todayIsoDate } from 'src/utils/org-date';
import { useAgendaQuickAddSubmit } from './composables/use-agenda-quick-add-submit';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const { loading, habits, weekDays, selectedDate, selectDay } = useHabits();
const { agendaConfig, knownOrgFiles, quickAddLoading, resolvedInboxPath, submitQuickAdd } =
  useAgendaQuickAddSubmit({ toastKey: i18nKeys.orgAgendaQuickAddHabitToastAdded });
const fileContent = api.core.useFileContent();
const fileLocks = new Map<string, Promise<void>>();

const runHabitMutation = async (
  habit: AgendaHabitView,
  mutation: (content: string) => string,
): Promise<void> => {
  const readResult = await to(fileContent.read, 'Failed to read habit file')(habit.filePath);
  if (readResult.isErr()) {
    reporter.reportError(readResult.error);
    return;
  }

  const currentContent = uint8ArrayToText(readResult.value);
  const mutationResult = to(mutation, 'Failed to apply habit mutation')(currentContent);
  if (mutationResult.isErr()) {
    reporter.reportError(mutationResult.error);
    return;
  }

  const nextContent = mutationResult.value;
  if (nextContent === currentContent) return;
  const writeResult = await to(fileContent.write, 'Failed to write habit file')(
    habit.filePath,
    textToUint8Array(nextContent),
  );
  if (writeResult.isErr()) reporter.reportError(writeResult.error);
};

const applyHabitMutation = async (
  habit: AgendaHabitView,
  mutation: (content: string) => string,
): Promise<void> => {
  const previous = fileLocks.get(habit.filePath) ?? Promise.resolve();
  const next = previous.then(() => runHabitMutation(habit, mutation));
  fileLocks.set(
    habit.filePath,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  await next;
};

const editHabitTitle = (habit: AgendaHabitView, title: string): Promise<void> => {
  if (habit.start === undefined) return Promise.resolve();
  return applyHabitMutation(habit, (c) => changeTaskTitle(c, habit.start!, title));
};

const editHabitPriority = (habit: AgendaHabitView, priority: string | undefined): Promise<void> => {
  if (habit.start === undefined) return Promise.resolve();
  return applyHabitMutation(habit, (c) => changeTaskPriority(c, habit.start!, priority));
};

const onToggle = (habit: AgendaHabitView): Promise<void> => {
  const headlineStart = habit.start;
  if (headlineStart === undefined) return Promise.resolve();
  const date = selectedDate.value;
  if (clockMatchesDate(habit, date)) {
    return applyHabitMutation(habit, (c) => removeHabitClock(c, headlineStart, date));
  }
  if (date === todayIsoDate() && habit.scheduled?.repeater) {
    return applyHabitMutation(habit, (c) => completeHabit(c, headlineStart, new Date()));
  }
  const dateObj = parseISO(date);
  return applyHabitMutation(habit, (c) => addHabitClock(c, headlineStart, dateObj));
};
</script>

<style lang="scss" scoped>
.agenda-buffer {
  @include fit;
  box-sizing: border-box;
  padding: var(--editor-padding);
}
</style>
