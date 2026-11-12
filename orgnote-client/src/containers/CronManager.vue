<template>
  <container-layout gap="md">
    <template #header>
      <app-grid :cols="1" gap="md">
        <app-grid :cols="2" gap="md">
          <StatCard :value="tasks.length" label="Total Tasks" />
          <StatCard :value="status" label="Scheduler Status" />
        </app-grid>

        <app-flex end align-center gap="sm">
          <action-button
            @click="pauseAll"
            color="orange"
            class="action-btn"
            size="sm"
            outline
            border
            icon="sym_o_pause_circle"
            tooltip="Pause All"
          />
          <action-button
            @click="resumeAll"
            color="green"
            class="action-btn"
            size="sm"
            outline
            border
            icon="sym_o_play_circle"
            tooltip="Resume All"
          />
        </app-flex>
      </app-grid>
    </template>

    <template #body>
      <card-wrapper class="cron-tasks">
        <empty-state v-if="tasks.length === 0" :title="$t(i18n.NOT_FOUND)" />
        <CronTaskComponent
          v-else
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          @run="runTask"
          @pause="pauseTask"
          @resume="resumeTask"
          @stop="stopTask"
        />
      </card-wrapper>
    </template>
  </container-layout>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { api } from 'src/boot/api';
import { i18n } from 'orgnote-api';
import CardWrapper from 'src/components/CardWrapper.vue';
import ActionButton from 'src/components/ActionButton.vue';
import CronTaskComponent from 'src/components/CronTask.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import AppGrid from 'src/components/AppGrid.vue';
import StatCard from 'src/components/StatCard.vue';
import AppFlex from 'src/components/AppFlex.vue';
import EmptyState from 'src/components/EmptyState.vue';

const cronStore = api.core.useCron();

const tasks = computed(() => Object.values(cronStore.tasks ?? {}));
const status = computed(() => cronStore.status);

const pauseAll = async () => {
  await cronStore.pauseAll();
};

const resumeAll = async () => {
  await cronStore.resumeAll();
};

const runTask = async (taskId: string) => {
  await cronStore.runImmediately(taskId);
};

const pauseTask = async (taskId: string) => {
  await cronStore.pause(taskId);
};

const resumeTask = async (taskId: string) => {
  await cronStore.resume(taskId);
};

const stopTask = async (taskId: string) => {
  await cronStore.stop(taskId);
};
</script>

<style lang="scss" scoped>
.cron-tasks {
  height: 100%;
  overflow-y: auto;
}
</style>
