<template>
  <app-flex column align-center center full-width full-height gap="lg" class="pomodoro-timer">
    <app-segmented-control
      :model-value="sessionType"
      :options="modeOptions"
      :disabled="isTransitioning"
      size="md"
      @update:model-value="onSessionTypeChange"
    />

    <app-button
      class="task-eyebrow"
      type="plain"
      size="sm"
      :disabled="isTransitioning"
      @click="onSelectTask"
    >
      <app-flex row align-center gap="xs">
        <app-icon name="sym_o_task_alt" size="xs" />
        <overflow-line class="task-label">{{ taskLabel }}</overflow-line>
      </app-flex>
    </app-button>

    <progress-ring
      :progress="progress"
      :display-time="displayTime"
      :session-type="sessionType"
      :is-running="isRunning"
      :has-session="hasSession"
      :disabled="isTransitioning"
      :phase-label="phaseLabel"
      :duration-min="localDuration"
      @click="onRingClick"
      @update:duration-min="onDurationChange"
    />

    <app-flex column align-center gap="sm" class="actions">
      <command-action-button
        v-if="!hasSession"
        :command="
          sessionType === 'pomo'
            ? AGENDA_POMODORO_START_COMMAND
            : AGENDA_POMODORO_START_STOPWATCH_COMMAND
        "
        :text="t(i18nKeys.orgAgendaPomodoroStart)"
        size="md"
        alignment="left"
        include-text
      />
      <command-action-button
        v-else-if="isPaused"
        :command="AGENDA_POMODORO_RESUME_COMMAND"
        :text="t(i18nKeys.orgAgendaPomodoroResume)"
        size="md"
        alignment="left"
        include-text
      />
      <command-action-button
        v-else
        :command="AGENDA_POMODORO_PAUSE_COMMAND"
        :text="t(i18nKeys.orgAgendaPomorodoPause)"
        alignment="left"
        size="md"
        include-text
      />
      <command-action-button
        :command="AGENDA_POMODORO_STOP_COMMAND"
        :text="t(i18nKeys.orgAgendaPomodoroStop)"
        :class="{ invisible: !hasSession }"
        alignment="left"
        size="md"
        include-text
      />
    </app-flex>

    <span v-if="todayPomoCount > 0" class="session-counter">
      {{ t(i18nKeys.orgAgendaPomodoroTodayCount, { count: todayPomoCount }) }}
    </span>
  </app-flex>
</template>

<script lang="ts" setup>
import AppFlex from 'src/components/AppFlex.vue';
import AppButton from 'src/components/AppButton.vue';
import AppSegmentedControl from 'src/components/AppSegmentedControl.vue';
import AppIcon from 'src/components/AppIcon.vue';
import OverflowLine from 'src/components/OverflowLine.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import {
  AGENDA_POMODORO_START_COMMAND,
  AGENDA_POMODORO_START_STOPWATCH_COMMAND,
  AGENDA_POMODORO_PAUSE_COMMAND,
  AGENDA_POMODORO_RESUME_COMMAND,
  AGENDA_POMODORO_STOP_COMMAND,
} from '../constants';
import ProgressRing from './ProgressRing.vue';
import { usePomodoroTimer } from '../composables/use-pomodoro-timer';

const {
  t,
  displayTime,
  progress,
  isRunning,
  isPaused,
  hasSession,
  isTransitioning,
  sessionType,
  localDuration,
  taskLabel,
  modeOptions,
  phaseLabel,
  todayPomoCount,
  onDurationChange,
  onSelectTask,
  onSessionTypeChange,
  onRingClick,
} = usePomodoroTimer();
</script>

<style lang="scss" scoped>
.pomodoro-timer {
  padding: var(--gap-xl) var(--gap-md);
}

.task-eyebrow {
  background: transparent !important;
  opacity: 0.55;
  max-width: 260px;

  @include hover {
    background: transparent !important;
    opacity: 1;
  }

  &:disabled {
    background: transparent !important;
    opacity: var(--disabled-opacity);
  }
}

.task-label {
  @include fontify(var(--font-size-sm), var(--font-weight-regular), false);
}

.invisible {
  visibility: hidden;
  pointer-events: none;
}

.session-counter {
  @include fontify(var(--font-size-xs), var(--font-weight-regular), false);
  color: var(--fg-muted);
  opacity: 0.4;
}
</style>
