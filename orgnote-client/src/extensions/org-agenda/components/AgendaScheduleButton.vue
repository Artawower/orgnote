<template>
  <date-picker-popover
    :model-value="model?.date"
    confirm-mode
    :show-shortcuts="false"
    @update:model-value="setDate"
    @confirm="emitClosed"
    @closed="emitClosed"
  >
    <template #trigger="{ open }">
      <action-button
        :icon="model ? undefined : 'sym_o_calendar_today'"
        size="sm"
        :active="!!model"
        :auto-width="!!model"
        :aria-label="t(i18nKeys.orgAgendaQuickAddDateTooltip)"
        @click="open"
      >
        <template v-if="model" #text>
          <span :class="toneClass">{{ scheduleLabel }}</span>
        </template>
      </action-button>
    </template>
    <template #header>
      <app-segmented-control
        v-model="scheduleMode"
        :options="scheduleModeOptions"
        size="sm"
        class="schedule-mode"
      />
    </template>
    <template #sections>
      <app-flex column align-stretch gap="xs" class="schedule-options">
        <agenda-repeat-picker :model-value="model?.repeater" @update:model-value="setRepeater" />
      </app-flex>
      <app-flex
        v-if="showHabitToggle && model?.repeater"
        row
        between
        align-center
        gap="sm"
        class="habit-row"
      >
        <app-flex row align-center gap="xs">
          <app-icon name="sym_o_repeat_on" size="sm" />
          <span>{{ t(i18nKeys.orgAgendaScheduleHabit) }}</span>
        </app-flex>
        <app-checkbox v-model="isHabit" />
      </app-flex>
    </template>
  </date-picker-popover>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { format, isPast, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import type { OrgRepeater } from 'org-mode-ast';
import ActionButton from 'src/components/ActionButton.vue';
import DatePickerPopover from 'src/components/DatePickerPopover.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import AppCheckbox from 'src/components/AppCheckbox.vue';
import AppSegmentedControl from 'src/components/AppSegmentedControl.vue';
import type { SegmentOption } from 'src/components/app-segmented-control.types';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import AgendaRepeatPicker from './AgendaRepeatPicker.vue';
import { formatOrgDateLabel } from 'src/utils/format-org-date';
import type { AgendaScheduleDraft } from '../types';

withDefaults(defineProps<{ showHabitToggle?: boolean }>(), { showHabitToggle: true });

const emit = defineEmits<{ closed: [] }>();

const model = defineModel<AgendaScheduleDraft | undefined>();
const isHabit = defineModel<boolean>('habit', { default: false });
const { t } = useI18n({ useScope: 'global', inheritLocale: true });

type DateTone = 'overdue' | 'today' | 'tomorrow' | 'future' | 'past';
type ScheduleMode = 'date' | 'duration';

const scheduleMode = ref<ScheduleMode>('date');

const scheduleModeOptions = computed<SegmentOption<ScheduleMode>[]>(() => [
  { value: 'date', label: t(i18nKeys.orgAgendaScheduleDateTab) },
  { value: 'duration', label: t(i18nKeys.orgAgendaScheduleDurationTab) },
]);

const repeatLabel = computed(() => {
  const repeater = model.value?.repeater;
  if (!repeater) return '';
  return ` · ${repeater.type}${repeater.value}${repeater.unit}`;
});

const scheduleLabel = computed(() => {
  if (!model.value?.date) return '';
  return `${formatOrgDateLabel(model.value.date, t)}${repeatLabel.value}`;
});

const tone = computed<DateTone | null>(() => {
  if (!model.value?.date) return null;
  const date = parseISO(model.value.date);
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  if (isYesterday(date)) return 'past';
  if (isPast(date)) return 'overdue';
  return 'future';
});

const toneClass = computed(() => (tone.value ? `tone-${tone.value}` : ''));

const setDate = (date: string | undefined): void => {
  if (!date) {
    model.value = undefined;
    isHabit.value = false;
    return;
  }
  model.value = { ...model.value, date };
};

const emitClosed = (): void => {
  emit('closed');
};

const todayIsoDate = (): string => format(new Date(), 'yyyy-MM-dd');

const setRepeater = (repeater: OrgRepeater | undefined): void => {
  if (!model.value && !repeater) return;
  model.value = { date: model.value?.date ?? todayIsoDate(), ...model.value, repeater };
  if (!repeater) isHabit.value = false;
};
</script>

<style lang="scss" scoped>
.schedule-mode {
  width: 100%;
  margin-bottom: var(--padding-xs);

  :deep(.segment) {
    flex: 1;
  }
}

.schedule-options {
  padding-top: var(--padding-xs);
  border-top: var(--border-default);
  width: 100%;
}

.habit-row {
  padding-top: var(--padding-sm);
  border-top: var(--border-default);
  @include fontify(var(--font-size-sm), normal, var(--fg));
}

.tone-overdue {
  color: var(--red);
}

.tone-today {
  color: var(--accent);
}

.tone-tomorrow {
  color: var(--fg);
}

.tone-future,
.tone-past {
  color: var(--fg-muted);
}
</style>
