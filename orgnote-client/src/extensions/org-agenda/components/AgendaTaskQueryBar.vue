<template>
  <app-flex column align-stretch gap="xs" class="query-bar">
    <search-input
      v-model="filterStore.searchQuery"
      appearance="field"
      icon="sym_o_search"
      clearable
      :placeholder="i18nKeys.orgAgendaSearchPlaceholder"
    >
      <template #actions>
        <date-picker-popover
          :model-value="pickerSelection"
          selection-mode="both"
          confirm-mode
          @confirm="applyDateSelection"
        >
          <template #trigger="{ open }">
            <action-button
              icon="sym_o_calendar_month"
              size="sm"
              :aria-label="t(i18nKeys.orgTasksSidebarCalendarTitle)"
              @click="open"
            />
          </template>
        </date-picker-popover>
      </template>
    </search-input>

    <app-flex v-if="showSummary" row between align-center gap="sm" class="summary">
      <app-flex v-if="dateLabel" row align-center gap="xs">
        <app-badge :label="dateLabel" color="accent" size="xs" />
        <command-action-button
          :command="AGENDA_TASKS_CLEAR_DATE_FILTER_COMMAND"
          :aria-label="t(i18nKeys.orgAgendaDateFilterClear)"
          size="xs"
        />
      </app-flex>
      <app-badge :label="resultLabel" size="xs" />
    </app-flex>
  </app-flex>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { format, parseISO } from 'date-fns';
import { useI18n } from 'vue-i18n';
import ActionButton from 'src/components/ActionButton.vue';
import AppBadge from 'src/components/AppBadge.vue';
import AppFlex from 'src/components/AppFlex.vue';
import DatePickerPopover from 'src/components/DatePickerPopover.vue';
import SearchInput from 'src/components/SearchInput.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import type { DatePickerSelection } from 'src/models/date-picker';
import { AGENDA_TASKS_CLEAR_DATE_FILTER_COMMAND } from '../constants';
import { resolveAgendaDateSelection } from '../utils/agenda-date-selection';
import { useAgendaFilterStore } from '../stores/agenda-filter-store';
import type { AgendaDateFilter } from '../models/agenda-task-query';

const props = defineProps<{ dateFilter: AgendaDateFilter; resultCount: number }>();
const emit = defineEmits<{ 'select-date': [selection: DatePickerSelection] }>();
const filterStore = useAgendaFilterStore();
const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const pickerSelection = computed<DatePickerSelection>(() =>
  resolveAgendaDateSelection(props.dateFilter),
);
const applyDateSelection = (selection: DatePickerSelection): void => {
  emit('select-date', selection);
};

const formatDate = (date: string): string => format(parseISO(date), 'MMM d, yyyy');
const dateLabel = computed(() => {
  const filter = props.dateFilter;
  if (filter.kind === 'preset') return undefined;
  if (filter.kind === 'day') return formatDate(filter.value);
  if (filter.from === filter.to) return formatDate(filter.from);
  return `${formatDate(filter.from)} – ${formatDate(filter.to)}`;
});
const showSummary = computed(() => !!filterStore.searchQuery.trim() || !!dateLabel.value);
const resultLabel = computed(() =>
  t(i18nKeys.orgAgendaSearchResultCount, { count: props.resultCount }),
);
</script>

<style scoped lang="scss">
.query-bar {
  width: 100%;
}

.summary {
  min-height: var(--button-xs-height);
}
</style>
