<template>
  <div class="task-wrapper">
    <app-spoiler>
      <template #title>
        <app-flex row between class="full-width">
          <app-flex gap="md" align="center">
            <app-icon
              :name="getStatusIcon(task.status)"
              :color="getStatusColor(task.status)"
              size="sm"
            />

            <monochrome-face>
              {{ task.id }}
            </monochrome-face>

            <app-badge :color="getStatusColor(task.status)" size="xs">
              {{ task.status }}
            </app-badge>

            <app-badge v-if="scheduleLabel" color="blue" size="xs">
              {{ scheduleLabel }}
            </app-badge>
          </app-flex>

          <app-flex gap="sm" align="center">
            <app-flex v-if="task.lastRun" gap="xs" align="center">
              <span class="text-caption text-grey">Last:</span>
              <app-date :date="task.lastRun" format="time" />
            </app-flex>
            <app-flex v-if="task.nextRun" gap="xs" align="center">
              <span class="text-caption text-grey">Next:</span>
              <app-date :date="task.nextRun" format="time" />
            </app-flex>

            <action-button
              @click.stop="$emit('run', task.id)"
              size="sm"
              color="blue"
              outline
              border
              icon="sym_o_play_arrow"
              tooltip="Run immediately"
            />

            <action-button
              v-if="task.status === 'active'"
              @click.stop="$emit('pause', task.id)"
              size="sm"
              color="orange"
              outline
              border
              icon="sym_o_pause"
              tooltip="Pause"
            />

            <action-button
              v-if="task.status === 'paused'"
              @click.stop="$emit('resume', task.id)"
              size="sm"
              color="green"
              outline
              border
              icon="sym_o_resume"
              tooltip="Resume"
            />

            <action-button
              @click.stop="$emit('stop', task.id)"
              size="sm"
              color="red"
              outline
              border
              icon="sym_o_stop"
              tooltip="Stop"
            />
          </app-flex>
        </app-flex>
      </template>
      <template #body>
        <log-entry :log="log" minimal />
      </template>
    </app-spoiler>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { type CronTask, type LogRecord, type ThemeVariable } from 'orgnote-api';
import AppIcon from './AppIcon.vue';
import AppBadge from './AppBadge.vue';
import AppDate from './AppDate.vue';
import AppSpoiler from './AppSpoiler.vue';
import AppFlex from './AppFlex.vue';
import MonochromeFace from './MonochromeFace.vue';
import ActionButton from './ActionButton.vue';
import LogEntry from './LogEntry.vue';

const props = defineProps<{
  task: CronTask;
}>();

defineEmits<{
  (e: 'run', taskId: string): void;
  (e: 'pause', taskId: string): void;
  (e: 'resume', taskId: string): void;
  (e: 'stop', taskId: string): void;
}>();

const statusIcons: Record<string, string> = {
  active: 'sym_o_schedule',
  paused: 'sym_o_pause_circle',
  stopped: 'sym_o_stop_circle',
  error: 'sym_o_error',
};

const statusColors: Record<string, ThemeVariable> = {
  active: 'green',
  paused: 'orange',
  stopped: 'fg-muted',
  error: 'red',
};

const getStatusIcon = (status: string = '') => {
  return statusIcons[status] ?? 'sym_o_help';
};

const getStatusColor = (status: string = ''): ThemeVariable => {
  return statusColors[status] ?? 'fg-muted';
};

const scheduleLabel = computed(() => {
  if ('interval' in props.task) {
    return `Interval: ${props.task.interval}ms`;
  }
  if ('cron' in props.task) {
    return `Cron: ${props.task.cron}`;
  }
  return '';
});

const log = computed<LogRecord>(() => {
  const { task } = props;

  return {
    level: 'info',
    message: JSON.stringify(task),
    ts: new Date(),
    context: { task: { ...task } },
  };
});
</script>
