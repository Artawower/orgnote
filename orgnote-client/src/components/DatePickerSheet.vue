<template>
  <div
    v-swipe-stop
    class="date-picker-sheet"
    @swipe-left="datePickerRef?.navigateMonth(1)"
    @swipe-right="datePickerRef?.navigateMonth(-1)"
  >
    <app-flex column gap="sm" class="sheet-content">
      <slot name="header" />
      <app-segmented-control
        v-if="selectionMode === 'both'"
        v-model="activeMode"
        :options="modeOptions"
        size="sm"
        class="selection-mode"
      />
      <app-flex
        v-if="showShortcuts"
        row
        align-center
        full-width
        justify="end"
        gap="xs"
        class="shortcuts"
      >
        <action-button
          icon="sym_o_today"
          size="md"
          :title="t(i18nKeys.orgAgendaQuickAddToday)"
          @click="onShortcut('today')"
        />
        <action-button
          icon="sym_o_event"
          size="md"
          :title="t(i18nKeys.orgAgendaQuickAddTomorrow)"
          @click="onShortcut('tomorrow')"
        />
        <action-button
          icon="sym_o_date_range"
          size="md"
          :title="t(i18nKeys.orgAgendaQuickAddNextWeek)"
          @click="onShortcut('next7days')"
        />
        <action-button
          icon="sym_o_close"
          size="md"
          :disabled="!selectedValue"
          :title="t(i18nKeys.orgAgendaQuickAddNoDate)"
          @click="clear"
        />
      </app-flex>
      <app-date-picker
        :key="activeMode"
        ref="datePickerRef"
        :model-value="calendarSelection"
        :mode="activeMode"
        minimal
        @date-click="selectDay"
        @range-select="selectRange"
      />
      <slot name="sections" />
      <slot name="footer" :confirm="confirm" :clear="clear" :value="selectedValue">
        <app-flex v-if="confirmMode" row between align-center full-width gap="sm" class="footer">
          <app-button type="plain" size="sm" class="footer-button" @click="clear">
            {{ t(i18nKeys.orgAgendaScheduleClear) }}
          </app-button>
          <app-button
            type="active"
            size="sm"
            class="footer-button"
            @click="confirm"
          >
            {{ t(i18nKeys.orgAgendaScheduleOk) }}
          </app-button>
        </app-flex>
      </slot>
    </app-flex>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { addDays, format } from 'date-fns';
import { useI18n } from 'vue-i18n';
import AppFlex from 'src/components/AppFlex.vue';
import AppDatePicker from 'src/components/AppDatePicker.vue';
import ActionButton from 'src/components/ActionButton.vue';
import AppButton from 'src/components/AppButton.vue';
import AppSegmentedControl from 'src/components/AppSegmentedControl.vue';
import type { SegmentOption } from 'src/components/app-segmented-control.types';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import type {
  DatePickerSelection,
  DatePickerSelectionMode,
  DateRange,
} from 'src/models/date-picker';
import {
  isoRangeToSlashDateRange,
  isoToSlashDate,
  slashRangeToIsoDateRange,
  slashToIsoDate,
} from 'src/utils/org-date';

type ActiveSelectionMode = Exclude<DatePickerSelectionMode, 'both'>;
type Shortcut = 'today' | 'tomorrow' | 'next7days';

const SHORTCUT_OFFSETS: Readonly<Record<Shortcut, number>> = {
  today: 0,
  tomorrow: 1,
  next7days: 7,
};

const props = withDefaults(
  defineProps<{
    modelValue?: DatePickerSelection;
    selectionMode?: DatePickerSelectionMode;
    confirmMode?: boolean;
    showShortcuts?: boolean;
  }>(),
  {
    selectionMode: 'single',
    confirmMode: false,
    showShortcuts: true,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: DatePickerSelection];
  confirm: [value: DatePickerSelection];
}>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const datePickerRef = ref<InstanceType<typeof AppDatePicker> | null>(null);
const day = ref<string>();
const range = ref<DateRange>();

const resolveActiveMode = (): ActiveSelectionMode => {
  if (props.selectionMode !== 'both') return props.selectionMode;
  return typeof props.modelValue === 'object' ? 'range' : 'single';
};

const activeMode = ref<ActiveSelectionMode>(resolveActiveMode());
const selectedValue = computed<DatePickerSelection>(() =>
  activeMode.value === 'single' ? day.value : range.value,
);
const calendarSelection = computed<DatePickerSelection>(() => {
  if (activeMode.value === 'single') {
    return day.value ? isoToSlashDate(day.value) : undefined;
  }
  return range.value ? isoRangeToSlashDateRange(range.value) : undefined;
});
const modeOptions = computed<SegmentOption<ActiveSelectionMode>[]>(() => [
  { value: 'single', label: t(i18nKeys.orgAgendaDateFilterDay) },
  { value: 'range', label: t(i18nKeys.orgAgendaDateFilterRange) },
]);

const syncSelection = (value: DatePickerSelection): void => {
  if (props.selectionMode === 'both' && value) {
    activeMode.value = typeof value === 'string' ? 'single' : 'range';
  }
  if (typeof value === 'string') {
    day.value = value;
    range.value = { from: value, to: value };
    return;
  }
  if (!value) {
    day.value = undefined;
    range.value = undefined;
    return;
  }
  day.value = value.from;
  range.value = { ...value };
};

watch(() => props.modelValue, syncSelection, { immediate: true });
watch(
  () => props.selectionMode,
  () => {
    activeMode.value = resolveActiveMode();
  },
);

const updateValue = (): void => {
  if (props.confirmMode) return;
  emit('update:modelValue', selectedValue.value);
};

const selectDay = ({ date }: { date: string }): void => {
  if (activeMode.value !== 'single') return;
  day.value = slashToIsoDate(date);
  updateValue();
};

const selectRange = (value: DateRange): void => {
  range.value = slashRangeToIsoDateRange(value);
  updateValue();
};

const toIsoDate = (date: Date): string => format(date, 'yyyy-MM-dd');
const shortcutDates = (shortcut: Shortcut): DateRange => {
  const today = new Date();
  if (shortcut === 'next7days' && activeMode.value === 'range') {
    return { from: toIsoDate(today), to: toIsoDate(addDays(today, 7)) };
  }
  const date = toIsoDate(addDays(today, SHORTCUT_OFFSETS[shortcut]));
  return { from: date, to: date };
};

const onShortcut = (shortcut: Shortcut): void => {
  const dates = shortcutDates(shortcut);
  day.value = dates.from;
  range.value = dates;
  updateValue();
};

const clear = (): void => {
  day.value = undefined;
  range.value = undefined;
  updateValue();
};

const confirm = (): void => {
  emit('update:modelValue', selectedValue.value);
  emit('confirm', selectedValue.value);
};
</script>

<style lang="scss" scoped>
.date-picker-sheet {
  box-sizing: border-box;
  width: var(--date-picker-sheet-width, 320px);
  max-width: 100vw;
  padding: var(--padding-md);
}

.sheet-content,
.selection-mode {
  width: 100%;
}

.selection-mode :deep(.segment),
.footer-button {
  flex: 1;
}

.shortcuts {
  padding: 0;
}

.footer {
  padding-top: var(--padding-sm);
  border-top: var(--border-default);
}
</style>
