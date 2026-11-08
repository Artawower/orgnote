<template>
  <agenda-quick-add
    ref="quickAddRef"
    :agenda-files-path="agendaConfig.agendaFilesPath ?? '/'"
    :inbox-file-path="resolvedInboxPath"
    :known-files="knownOrgFiles"
    :loading="quickAddLoading"
    :default-date="quickAddDate"
    :default-target-file="filterStore.selectedFilePath"
    @submit="submitQuickAdd"
  />
</template>

<script lang="ts" setup>
import { computed, onUnmounted, ref } from 'vue';
import { api } from 'src/boot/api';
import AgendaQuickAdd from '../components/AgendaQuickAdd.vue';
import { subscribeToQuickAddToFileCommand } from '../commands/quick-add-to-file-command';
import { useAgendaQuickAddSubmit } from '../composables/use-agenda-quick-add-submit';
import { useAgendaFilterStore } from '../stores/agenda-filter-store';
import { resolveAgendaQuickAddDate } from '../utils/agenda-date-selection';
import type { AgendaDateFilter } from '../models/agenda-task-query';

const props = defineProps<{ dateFilter: AgendaDateFilter }>();
const quickAddRef = ref<InstanceType<typeof AgendaQuickAdd> | null>(null);
const filterStore = useAgendaFilterStore();
const quickAddDate = computed(() => resolveAgendaQuickAddDate(props.dateFilter));
const { agendaConfig, knownOrgFiles, quickAddLoading, resolvedInboxPath, submitQuickAdd } =
  useAgendaQuickAddSubmit();

const selectTargetFile = (filePath: string): void => {
  quickAddRef.value?.setTargetFileAndFocus(filePath);
};

const unsubscribe = subscribeToQuickAddToFileCommand(
  api.core.useCommands(),
  selectTargetFile,
);

onUnmounted(unsubscribe);
</script>
