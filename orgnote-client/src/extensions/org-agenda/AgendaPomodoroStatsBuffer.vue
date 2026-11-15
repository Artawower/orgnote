<template>
  <app-buffer-content constrained>
    <container-layout :body-scroll="true" stable-scrollbar gap="sm">
      <template #body>
        <app-flex column start align-stretch gap="md" class="stats-body">
          <agenda-pomodoro-overview />

          <app-calendar-heatmap-chart
            :entries="calendarEntries"
            :labels="calendarLabels"
            :locale="locale"
            :month="calendarMonth"
            :selected-date="selectedDate"
            :view="calendarView"
            :year="calendarYear"
            @select-date="selectDate"
          />

          <app-flex column start align-stretch gap="sm" class="selected-day">
            <app-title :level="5">{{ selectedDateLabel }}</app-title>
            <app-time-range-bar-chart
              :entries="dailyChartEntries"
              :labels="timeRangeLabels"
              :locale="locale"
              :range="selectedDayRange"
            />
            <agenda-focus-record :intervals="selectedIntervals" />
          </app-flex>
        </app-flex>
      </template>
    </container-layout>
  </app-buffer-content>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { addDays, format, parseISO } from 'date-fns';
import AppBufferContent from 'src/components/AppBufferContent.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppTitle from 'src/components/AppTitle.vue';
import AppCalendarHeatmapChart from 'src/components/charts/AppCalendarHeatmapChart.vue';
import AppTimeRangeBarChart from 'src/components/charts/AppTimeRangeBarChart.vue';
import type {
  CalendarHeatmapLabels,
  CalendarHeatmapView,
} from 'src/components/charts/calendar-heatmap-types';
import type {
  TimeRangeBarEntry,
  TimeRangeBarLabels,
  TimeRangeBarRange,
} from 'src/components/charts/time-range-bar-types';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import { api } from 'src/boot/api';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import AgendaPomodoroOverview from './components/AgendaPomodoroOverview.vue';
import AgendaFocusRecord from './components/AgendaFocusRecord.vue';
import { useAgendaTasksStore } from './stores/agenda-tasks-store';
import { formatDurationMin } from './utils/format-duration';
import {
  createFocusCalendarEntries,
  extractFocusIntervals,
  selectFocusIntervals,
} from './utils/focus-statistics';

const DATE_FORMAT = 'yyyy-MM-dd';
const MINUTE_MS = 60_000;

const { t, locale } = useI18n({ useScope: 'global', inheritLocale: true });
const tasksStore = useAgendaTasksStore();
const { tabletBelow } = api.ui.useScreenDetection();
const selectedDate = ref(format(new Date(), DATE_FORMAT));

const intervals = computed(() => extractFocusIntervals(tasksStore.allFiles));
const calendarEntries = computed(() => createFocusCalendarEntries(intervals.value));
const selectedIntervals = computed(() => selectFocusIntervals(intervals.value, selectedDate.value));
const selectedDay = computed(() => parseISO(selectedDate.value));
const calendarMonth = computed(() => selectedDay.value.getMonth() + 1);
const calendarYear = computed(() => selectedDay.value.getFullYear());
const calendarView = computed<CalendarHeatmapView>(() => (tabletBelow.value ? 'month' : 'year'));
const selectedDayRange = computed<TimeRangeBarRange>(() => ({
  startTime: selectedDay.value.getTime(),
  endTime: addDays(selectedDay.value, 1).getTime(),
}));
const dailyChartEntries = computed<TimeRangeBarEntry[]>(() =>
  selectedIntervals.value.map((interval) => ({
    label: interval.taskText,
    startTime: interval.startTime,
    endTime: interval.endTime,
  })),
);
const selectedDateLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(selectedDay.value),
);
const calendarLabels = computed<CalendarHeatmapLabels>(() => ({
  ariaLabel: t(i18nKeys.orgAgendaPomodoroFocusRecord),
  less: '−',
  more: '+',
  formatValue: formatDurationMin,
}));
const timeRangeLabels = computed<TimeRangeBarLabels>(() => ({
  ariaLabel: t(i18nKeys.orgAgendaPomodoroFocusRecord),
  formatDuration: (duration) => formatDurationMin(Math.round(duration / MINUTE_MS)),
}));

const selectDate = (date: string): void => {
  selectedDate.value = date;
};

onMounted(() => tasksStore.ensureLoaded());
</script>

<style lang="scss" scoped>
.stats-body {
  padding: var(--gap-sm);
}

.selected-day {
  width: 100%;
}
</style>
