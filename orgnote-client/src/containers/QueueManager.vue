<template>
  <container-layout gap="md">
    <template #header>
      <app-grid :cols="1" gap="md">
        <app-grid :cols="4" gap="md">
          <StatCard :value="stats.total" label="Total" />
          <StatCard :value="stats.peak" label="Peak" />
          <StatCard :value="(stats.successRate * 100).toFixed(1) + '%'" label="Success Rate" />
          <StatCard :value="stats.average.toFixed(0) + 'ms'" label="Avg Time" />
        </app-grid>

        <app-flex end gap="sm">
          <action-button
            @click="refresh"
            color="fg"
            class="action-btn"
            size="sm"
            outline
            border
            icon="sym_o_refresh"
          />
          <action-button
            @click="togglePause"
            color="fg"
            class="action-btn"
            size="sm"
            outline
            border
            :icon="isPaused ? 'sym_o_play_arrow' : 'sym_o_pause'"
          />
          <action-button
            @click="clearQueue"
            color="red"
            class="action-btn"
            size="sm"
            outline
            border
            icon="sym_o_delete_sweep"
          />
        </app-flex>

        <app-dropdown
          v-model="selectedQueue"
          :options="queueStore.queueIds"
          :clearable="false"
          :use-input="false"
          class="queue-dropdown"
          @update:model-value="refresh"
        />
      </app-grid>
    </template>

    <template #body>
      <card-wrapper class="queue-tasks">
        <empty-state v-if="tasks.length === 0" :title="$t(i18n.NOT_FOUND)" />
        <q-virtual-scroll
          v-else
          :items="tasks"
          :virtual-scroll-item-size="64"
          :virtual-scroll-slice-size="20"
          v-slot="{ item }"
          class="full-height"
        >
          <QueueTaskComponent
            :key="item.id"
            :task="item"
            @cancel="cancelTask"
            @select="selectTask"
          />
        </q-virtual-scroll>
      </card-wrapper>
    </template>

    <template #footer>
      <menu-group>
        <menu-item type="info" @click="safeCopyToClipboard(tasksReport)">{{
          $t(I18N.COPY)
        }}</menu-item>
      </menu-group>
    </template>
  </container-layout>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { api } from 'src/boot/api';
import type { QueueTask, QueueStats } from 'orgnote-api';
import { I18N, i18n } from 'orgnote-api';
import CardWrapper from 'src/components/CardWrapper.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import ActionButton from 'src/components/ActionButton.vue';
import AppDropdown from 'src/components/AppDropdown.vue';
import QueueTaskComponent from 'src/components/QueueTask.vue';
import TaskDetailsModal from 'src/components/TaskDetailsModal.vue';
import MenuItem from './MenuItem.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import AppGrid from 'src/components/AppGrid.vue';
import StatCard from 'src/components/StatCard.vue';
import AppFlex from 'src/components/AppFlex.vue';
import EmptyState from 'src/components/EmptyState.vue';
import { tasksToReport } from 'src/utils/tasks-to-report';
import { useInteractiveClipboard } from 'src/composables/use-interactive-clipboard';

const queueStore = api.core.useQueue();
const { safeCopyToClipboard } = useInteractiveClipboard();
const selectedQueue = ref('default');

const tasks = ref<QueueTask[]>([]);
const tasksReport = computed(() => tasksToReport(tasks.value));
const stats = ref<QueueStats>({
  total: 0,
  average: 0,
  successRate: 0,
  peak: 0,
});
const isPaused = ref(false);

let refreshInterval: number | undefined;

const refresh = async () => {
  const [fetchedTasks, fetchedStats] = await Promise.all([
    queueStore.getAll(selectedQueue.value),
    queueStore.getStats(selectedQueue.value),
  ]);
  tasks.value = fetchedTasks.sort((a, b) => (b.added || 0) - (a.added || 0));
  stats.value = fetchedStats;
};

const togglePause = () => {
  if (isPaused.value) {
    queueStore.resume(selectedQueue.value);
    isPaused.value = false;
    return;
  }
  queueStore.pause(selectedQueue.value);
  isPaused.value = true;
};

const clearQueue = async () => {
  await queueStore.clear(selectedQueue.value);
  await refresh();
};

const cancelTask = async (taskId: string) => {
  await queueStore.remove(taskId, selectedQueue.value);
  await refresh();
};

const selectTask = (taskId: string) => {
  const task = tasks.value.find((t) => t.id === taskId);
  if (!task) return;

  const modal = api.ui.useModal();
  modal.open(TaskDetailsModal, {
    title: i18n.TASK_DETAILS,
    modalProps: { task },
    modalEmits: {
      cancel: (id: string) => cancelTask(id),
      close: () => modal.close(),
    },
  });
};

onMounted(() => {
  refresh();
  refreshInterval = window.setInterval(refresh, 2000);
});

onUnmounted(() => {
  clearInterval(refreshInterval);
});
</script>

<style lang="scss" scoped>
.queue-tasks {
  height: 100%;
  overflow-y: auto;
}
</style>
