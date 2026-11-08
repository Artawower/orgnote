<template>
  <app-buffer-content constrained>
    <container-layout>
      <template #header>
        <app-flex row end align-center class="pomo-header">
          <command-action-button :command="AGENDA_POMODORO_STATS_COMMAND" size="md" />
        </app-flex>
      </template>
      <template #body>
        <agenda-pomodoro-timer />
      </template>
    </container-layout>
  </app-buffer-content>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import AppBufferContent from 'src/components/AppBufferContent.vue';
import AppFlex from 'src/components/AppFlex.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import AgendaPomodoroTimer from './components/AgendaPomodoroTimer.vue';
import { usePomodoroStore } from './stores/pomodoro-store';
import { useAgendaTasksStore } from './stores/agenda-tasks-store';
import { AGENDA_POMODORO_STATS_COMMAND } from './constants';

const pomodoroStore = usePomodoroStore();
const tasksStore = useAgendaTasksStore();

onMounted(async () => {
  await tasksStore.ensureLoaded();
  await pomodoroStore.restoreSession();
});
</script>

<style lang="scss" scoped>
.pomo-header {
  padding: var(--gap-sm) var(--gap-md);
}
</style>
