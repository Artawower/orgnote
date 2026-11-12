<template>
  <menu-item
    class="task-wrapper"
    @click="$emit('select', task.id)"
  >
    <app-flex row class="full-width">
      <app-flex gap="md">
        <app-icon
          :name="getStatusIcon(task.status)"
          :color="getStatusColor(task.status)"
          size="sm"
        />

        <monochrome-face>
          {{ task.id }}
          <template v-if="task.retries"> ({{ task.retries }} {{ $t(i18n.RETRIES) }}) </template>
        </monochrome-face>

        <app-badge :color="getStatusColor(task.status)" size="xs">
          {{ task.status }}
        </app-badge>
      </app-flex>
      <app-flex gap="md">
        <app-date v-if="task.added" :date="task.added" format="time" />
        <action-button
          v-if="isCancellable"
          size="sm"
          color="red"
          outline
          border
          icon="sym_o_cancel"
          @click.stop="$emit('cancel', task.id)"
        />
      </app-flex>
    </app-flex>
  </menu-item>
</template>

<script lang="ts" setup>
import { i18n, type QueueTask, type ThemeVariable } from 'orgnote-api';
import AppIcon from './AppIcon.vue';
import AppBadge from './AppBadge.vue';
import AppDate from './AppDate.vue';
import AppFlex from './AppFlex.vue';
import MonochromeFace from './MonochromeFace.vue';
import ActionButton from './ActionButton.vue';
import MenuItem from '../containers/MenuItem.vue';

defineProps<{
  task: QueueTask;
}>();

defineEmits<{
  (e: 'cancel', taskId: string): void;
  (e: 'select', taskId: string): void;
}>();

const statusIcons: Record<string, string> = {
  completed: 'sym_o_check_circle',
  failed: 'sym_o_error',
  processing: 'sym_o_sync',
  pending: 'sym_o_hourglass_empty',
  canceled: 'sym_o_cancel',
};

const statusColors: Record<string, ThemeVariable> = {
  completed: 'green',
  failed: 'red',
  processing: 'blue',
  pending: 'orange',
  canceled: 'red',
};

const getStatusIcon = (status: string = ''): string => statusIcons[status] ?? 'sym_o_help';

const getStatusColor = (status: string = ''): ThemeVariable => statusColors[status] ?? 'fg-muted';

const nonCancellableStatuses = ['completed', 'failed', 'canceled'];

const isCancellable = (status: string | undefined): boolean =>
  !!status && !nonCancellableStatuses.includes(status);
</script>
