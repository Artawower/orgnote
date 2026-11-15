<template>
  <div class="app-date-picker" :class="rootClasses">
    <q-date
      ref="qDateRef"
      v-model="internalModel"
      :minimal="minimal"
      :readonly="readonly"
      :multiple="isMultiple"
      :range="isRange"
      :events="eventDates"
      :event-color="getEventColor"
      :options="disabledDatesFn"
      :first-day-of-week="firstDayOfWeek"
      :default-view="defaultView"
      :navigation-min-year-month="minDate"
      :navigation-max-year-month="maxDate"
      :today-btn="todayBtn"
      :emit-immediately="emitImmediately"
      flat
      bordered
      @update:model-value="onModelUpdate"
      @navigation="onNavigation"
      @range-start="onRangeStart"
      @range-end="onRangeEnd"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { QDate } from 'quasar';
import type {
  DateMarker,
  DateMarkerType,
  DatePickerMode,
  DatePickerModelValue,
  DateNavigation,
  DateClickPayload,
  DateRange,
} from 'src/models/date-picker';

interface Props {
  mode?: DatePickerMode;
  readonly?: boolean;
  markers?: DateMarker[];
  markerType?: DateMarkerType;
  minimal?: boolean;
  disabledDates?: ((date: string) => boolean) | string[];
  minDate?: string;
  maxDate?: string;
  firstDayOfWeek?: string | number;
  todayBtn?: boolean;
  defaultView?: 'Calendar' | 'Months' | 'Years';
  emitImmediately?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'single',
  readonly: false,
  markers: () => [],
  markerType: 'dot',
  minimal: false,
  firstDayOfWeek: 1,
  todayBtn: true,
  defaultView: 'Calendar',
  emitImmediately: false,
});

const emit = defineEmits<{
  (e: 'dateClick', payload: DateClickPayload): void;
  (e: 'navigate', payload: DateNavigation): void;
  (e: 'rangeSelect', payload: DateRange): void;
  (e: 'rangeStart', payload: { year: number; month: number; day: number }): void;
}>();

const model = defineModel<DatePickerModelValue>();

const qDateRef = ref<QDate>();

const isRange = computed(() => props.mode === 'range');
const isMultiple = computed(() => props.mode === 'multiple');

const rootClasses = computed(() => ({
  'is-readonly': props.readonly,
  'is-minimal': props.minimal,
  [`marker-${props.markerType}`]: true,
}));

const markersByDate = computed(() =>
  props.markers.reduce((map, marker) => {
    const existingMarkers = map.get(marker.date) ?? [];
    map.set(marker.date, [...existingMarkers, marker]);
    return map;
  }, new Map<string, DateMarker[]>()),
);

const eventDates = computed(() => {
  return (date: string): boolean => markersByDate.value.has(date);
});

const getEventColor = computed(() => {
  return (date: string): string => {
    const markers = markersByDate.value.get(date);
    if (!markers?.length) return '';
    const firstWithColor = markers.find((m) => m.color);
    return firstWithColor?.color ?? '';
  };
});

const disabledDatesFn = computed(() => {
  if (!props.disabledDates) return undefined;
  if (Array.isArray(props.disabledDates)) {
    const disabledSet = new Set(props.disabledDates);
    return (date: string) => !disabledSet.has(date);
  }
  return (date: string) => !(props.disabledDates as (date: string) => boolean)(date);
});

const internalModel = computed({
  get: () => model.value ?? null,
  set: (value) => {
    model.value = value ?? undefined;
  },
});

const getMarkersForDate = (date: string): DateMarker[] => markersByDate.value.get(date) ?? [];

const onModelUpdate = (
  value: string | readonly unknown[] | unknown | null,
  _reason: string,
  details: { year: number; month: number; day: number },
) => {
  const dateStr = formatDateStr(details.year, details.month, details.day);

  emit('dateClick', {
    date: dateStr,
    markers: getMarkersForDate(dateStr),
  });
};

const onNavigation = (view: { year: number; month: number }) => {
  emit('navigate', { year: view.year, month: view.month });
};

const onRangeStart = (from: { year: number; month: number; day: number }) => {
  emit('rangeStart', from);
};

const onRangeEnd = (range: {
  from: { year: number; month: number; day: number };
  to: { year: number; month: number; day: number };
}) => {
  emit('rangeSelect', {
    from: formatDateStr(range.from.year, range.from.month, range.from.day),
    to: formatDateStr(range.to.year, range.to.month, range.to.day),
  });
};

const formatDateStr = (year: number, month: number, day: number): string => {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}/${m}/${d}`;
};

const setToday = () => qDateRef.value?.setToday();
const setView = (view: 'Calendar' | 'Months' | 'Years') => qDateRef.value?.setView(view);

const navigateMonth = (direction: 1 | -1): void => {
  qDateRef.value?.offsetCalendar('month', direction < 0);
};

defineExpose({
  setToday,
  setView,
  navigateMonth,
});
</script>

<style lang="scss" scoped>
.app-date-picker {
  border: var(--date-picker-border);
  border-radius: var(--date-picker-radius);
  background: var(--date-picker-bg);

  :deep(.q-date) {
    font-size: var(--date-picker-font-size);
    box-shadow: none;
    width: 100%;
    min-width: unset;
    border: unset;

    .q-date__header {
      color: var(--date-picker-header-fg);
      background: transparent;
      padding: var(--padding-sm) var(--padding-md);
    }

    .q-date__header-title-label {
      font-size: var(--date-picker-header-font-size);
      font-weight: var(--date-picker-header-font-weight);
    }

    .q-date__navigation .q-btn {
      color: var(--fg-muted);
      min-width: var(--date-picker-nav-btn-size);
      min-height: var(--date-picker-nav-btn-size);
      border-radius: var(--date-picker-nav-btn-radius);

      @include hover {
        background: var(--date-picker-nav-btn-hover-bg);
        color: var(--date-picker-fg);
      }
    }

    .q-date__calendar-weekdays {
      color: var(--date-picker-weekday-fg);
      font-size: var(--date-picker-weekday-font-size);
      font-weight: var(--font-weight-medium);
    }

    .q-date__calendar-item .q-btn {
      width: var(--date-picker-day-size);
      height: var(--date-picker-day-size);
      min-width: var(--date-picker-day-size);
      min-height: var(--date-picker-day-size);
      border-radius: var(--date-picker-day-radius);
      color: var(--date-picker-day-fg);
      font-size: var(--font-size-sm);
      transition:
        background var(--date-picker-transition),
        color var(--date-picker-transition);

      @include hover {
        background: var(--date-picker-day-hover-bg);
      }
    }

    .q-date__calendar-item--fill .q-btn {
      opacity: var(--date-picker-day-outside-opacity);
    }

    .q-date__calendar-item--out {
      opacity: var(--date-picker-day-outside-opacity);
    }

    .q-date__today .q-btn {
      border: var(--date-picker-day-today-border);
      font-weight: var(--font-weight-bold);
    }

    .q-date__calendar-item .q-btn.bg-primary {
      background: var(--date-picker-day-selected-bg) !important;
      color: var(--date-picker-day-selected-fg) !important;
      box-shadow: none !important;
    }

    .q-date__range::before,
    .q-date__range-from::before,
    .q-date__range-to::before {
      background: var(--date-picker-range-bg) !important;
    }

    .q-date__edit-range::after {
      border-color: var(--date-picker-marker-default-color);
    }

    .q-date__edit-range-from-to::after {
      border-color: var(--date-picker-marker-default-color);
      border-radius: var(--date-picker-day-radius) !important;
    }

    .q-date__edit-range-from::after {
      border-top-left-radius: var(--date-picker-day-radius) !important;
      border-bottom-left-radius: var(--date-picker-day-radius) !important;
      border-color: var(--date-picker-marker-default-color);
    }

    .q-date__edit-range-to::after {
      border-top-right-radius: var(--date-picker-day-radius) !important;
      border-bottom-right-radius: var(--date-picker-day-radius) !important;
      border-color: var(--date-picker-marker-default-color);
    }

    .q-date__range-from .q-btn,
    .q-date__range-to .q-btn {
      background: var(--date-picker-day-selected-bg) !important;
      color: var(--date-picker-day-selected-fg) !important;
    }

    .q-date__event {
      bottom: var(--date-picker-marker-offset);
      background: var(--date-picker-marker-default-color);
    }

    .q-date__calendar-days-container .q-btn--unelevated.disabled {
      opacity: var(--date-picker-day-disabled-opacity) !important;
    }

    .q-date__calendar-item .q-btn.text-primary {
      color: var(--accent) !important;
    }

    .q-date__view {
      padding: var(--date-picker-padding);
    }

    .q-date__months-item .q-btn.bg-primary,
    .q-date__years-item .q-btn.bg-primary {
      background: var(--date-picker-day-selected-bg) !important;
      color: var(--date-picker-day-selected-fg) !important;
    }
  }

  &.marker-dot :deep(.q-date__event) {
    width: var(--date-picker-marker-size);
    height: var(--date-picker-marker-size);
    border-radius: 50%;
  }

  &.marker-bar :deep(.q-date__event) {
    width: 60%;
    height: var(--date-picker-marker-bar-height);
    border-radius: var(--border-radius-xs);
  }

  &.marker-highlight :deep(.q-date__calendar-item) {
    &:has(.q-date__event) .q-btn {
      background: var(--date-picker-marker-highlight-bg);
    }
  }

  &.marker-highlight :deep(.q-date__event) {
    display: none;
  }

  &.is-readonly {
    :deep(.q-date) {
      pointer-events: none;

      .q-date__navigation {
        pointer-events: auto;
      }
    }
  }
}
</style>
