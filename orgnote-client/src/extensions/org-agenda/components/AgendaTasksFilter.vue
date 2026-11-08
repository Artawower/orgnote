<template>
  <app-flex
    class="tasks-filter"
    :class="{ expanded: hasFileFilters && isFilesExpanded }"
    column
    start
    align-stretch
    gap="md"
  >
    <menu-group>
      <menu-item
        v-for="filter in filters"
        :key="filter.id"
        :active="isTasksBufferActive && modelValue === filter.id"
        @click="onFilterClick(filter.id)"
      >
        <app-flex class="item-label" row start align-center gap="sm" full-width>
          <app-icon :name="filter.icon" size="sm" />
          <overflow-line>{{ filter.label }}</overflow-line>
        </app-flex>
        <template #right>
          <app-badge
            v-if="totals[filter.id]"
            :label="String(totals[filter.id])"
            size="xs"
            :variant="filter.id === 'overdue' ? 'danger' : 'plain'"
          />
        </template>
      </menu-item>
    </menu-group>

    <app-spoiler
      v-if="hasFileFilters"
      v-model="isFilesExpanded"
      class="files-filter"
      variant="menu"
      :scrollable="isFilesExpanded"
      keep-mounted
    >
      <template #title>
        <app-flex class="item-label" row start align-center gap="sm" full-width>
          <app-icon name="sym_o_folder" size="sm" />
          <overflow-line>{{ t(extensionI18nKeys.orgAgendaFilterFiles) }}</overflow-line>
        </app-flex>
      </template>
      <template #body>
        <q-virtual-scroll
          :items="fileFilterItems"
          :virtual-scroll-item-size="AGENDA_FILE_ITEM_SIZE_ESTIMATE"
          :virtual-scroll-slice-size="AGENDA_FILE_SLICE_SIZE"
          class="files-scroll"
          v-slot="{ item }"
        >
          <div :key="item.key" class="file-filter-row">
            <menu-item
              :active="isFileItemActive(item)"
              @click="onFileItemClick(item)"
            >
              <app-flex class="item-label" row start align-center gap="sm" full-width>
                <app-icon
                  :name="item.kind === 'all' ? 'sym_o_folder_copy' : 'sym_o_description'"
                  size="sm"
                />
                <overflow-line>
                  {{
                    item.kind === 'all'
                      ? t(extensionI18nKeys.orgAgendaFilterAllFiles)
                      : item.file.fileTitle
                  }}
                </overflow-line>
              </app-flex>
              <template v-if="item.kind === 'file'" #right>
                <app-badge :label="String(item.file.taskCount)" size="xs" />
              </template>
            </menu-item>
          </div>
        </q-virtual-scroll>
      </template>
    </app-spoiler>
  </app-flex>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import MenuGroup from 'src/components/MenuGroup.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import AppBadge from 'src/components/AppBadge.vue';
import AppSpoiler from 'src/components/AppSpoiler.vue';
import OverflowLine from 'src/components/OverflowLine.vue';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';
import { api } from 'src/boot/api';
import { parseAgendaTaskBufferUri } from '../utils/agenda-task-buffer-uri';
import type {
  AgendaFileFilterOption,
  AgendaFilter,
} from '../composables/use-agenda-tasks';

const props = defineProps<{
  modelValue?: AgendaFilter;
  selectedFilePath?: string;
  totals: Record<AgendaFilter, number>;
  files: readonly AgendaFileFilterOption[];
}>();

const emit = defineEmits<{
  select: [filter: AgendaFilter];
  'select-file': [filePath?: string];
}>();

const onFilterClick = (filter: AgendaFilter): void => {
  emit('select', filter);
};

const onFileClick = (filePath: string): void => {
  emit('select-file', props.selectedFilePath === filePath ? undefined : filePath);
};

const onClearFileClick = (): void => {
  emit('select-file');
};

type AgendaFileListItem =
  | { readonly kind: 'all'; readonly key: 'all' }
  | { readonly kind: 'file'; readonly key: string; readonly file: AgendaFileFilterOption };

const AGENDA_FILE_ITEM_SIZE_ESTIMATE = 36;
const AGENDA_FILE_SLICE_SIZE = 30;

const onFileItemClick = (item: AgendaFileListItem): void => {
  if (item.kind === 'all') {
    onClearFileClick();
    return;
  }
  onFileClick(item.file.filePath);
};

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const isFilesExpanded = ref(true);
const hasFileFilters = computed(
  () => props.files.length > 0 || Boolean(props.selectedFilePath),
);
const fileFilterItems = computed<AgendaFileListItem[]>(() => [
  { kind: 'all', key: 'all' },
  ...props.files.map((file) => ({ kind: 'file' as const, key: file.filePath, file })),
]);

const { activeBufferUri } = storeToRefs(api.core.usePane());
const isTasksBufferActive = computed(() =>
  activeBufferUri.value ? Boolean(parseAgendaTaskBufferUri(activeBufferUri.value)) : false,
);
const isFileItemActive = (item: AgendaFileListItem): boolean =>
  isTasksBufferActive.value &&
  (item.kind === 'all'
    ? !props.selectedFilePath
    : props.selectedFilePath === item.file.filePath);

type AgendaFilterOption = { id: AgendaFilter; label: string; icon: string };

const filters = computed(
  () =>
    [
      {
        id: 'overdue',
        label: t(extensionI18nKeys.orgAgendaFilterOverdue),
        icon: 'sym_o_running_with_errors',
      },
      {
        id: 'today',
        label: t(extensionI18nKeys.orgAgendaFilterToday),
        icon: 'sym_o_today',
      },
      {
        id: 'tomorrow',
        label: t(extensionI18nKeys.orgAgendaFilterTomorrow),
        icon: 'sym_o_wb_sunny',
      },
      {
        id: 'next7days',
        label: t(extensionI18nKeys.orgAgendaFilterNext7Days),
        icon: 'sym_o_date_range',
      },
      {
        id: 'all',
        label: t(extensionI18nKeys.orgAgendaFilterAll),
        icon: 'sym_o_checklist',
      },
    ] satisfies ReadonlyArray<AgendaFilterOption>,
);
</script>

<style lang="scss" scoped>
.tasks-filter.expanded {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.files-scroll {
  height: 100%;
  min-height: 0;
}

.file-filter-row {
  padding-bottom: var(--menu-group-items-gap);
}

.item-label {
  min-width: 0;
}
</style>
