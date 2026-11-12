<template>
  <app-flex class="task-time-modal" column start align-stretch gap="md">
    <time-range-input
      v-model:duration="duration"
      v-model:start-time="selectedStartTime"
      :default-start-time="defaultStartTime"
      :duration-label="t(i18nKeys.orgAgendaTaskTimeDuration)"
      :hours-label="t(i18nKeys.orgAgendaTaskTimeHours)"
      :minutes-label="t(i18nKeys.orgAgendaTaskTimeMinutes)"
      :start-time-label="t(i18nKeys.orgAgendaTaskTimeStart)"
      :end-time-label="t(i18nKeys.orgAgendaTaskTimeEnd)"
      :end-time="endTime"
    />

    <app-flex class="actions" row end align-center gap="sm" full-width>
      <app-button class="action cancel" @click="modal.close()">
        {{ t(I18N.CANCEL) }}
      </app-button>
      <app-button class="action add-time" type="active" :disabled="!isValid" @click="submit">
        {{ t(i18nKeys.orgAgendaTaskTimeAdd) }}
      </app-button>
    </app-flex>
  </app-flex>
</template>

<script setup lang="ts">
import { I18N } from 'orgnote-api';
import { format } from 'date-fns';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import AppButton from 'src/components/AppButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import TimeRangeInput from 'src/components/TimeRangeInput.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import type { TimePickerValue } from 'src/models/time-picker';
import { createAgendaTaskClockRange, normalizeAgendaTaskTime } from '../models/task-time';

const TIME_FORMAT = 'HH:mm';
const EMPTY_DURATION: TimePickerValue = { hours: 0, minutes: 0 };

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const modal = api.ui.useModal();
const duration = ref<TimePickerValue>(EMPTY_DURATION);
const selectedStartTime = ref<TimePickerValue>();

const formatTimePickerValue = (value: TimePickerValue | undefined): string | undefined => {
  if (!value) return undefined;
  return `${String(value.hours).padStart(2, '0')}:${String(value.minutes).padStart(2, '0')}`;
};

const taskTime = computed(() =>
  normalizeAgendaTaskTime(
    duration.value.hours,
    duration.value.minutes,
    formatTimePickerValue(selectedStartTime.value),
  ),
);

const defaultStartTime = computed<TimePickerValue>(() => {
  const currentTime = new Date();
  const normalized = normalizeAgendaTaskTime(duration.value.hours, duration.value.minutes);
  const startedAt = normalized
    ? createAgendaTaskClockRange(normalized, currentTime).startedAt
    : currentTime;
  return { hours: startedAt.getHours(), minutes: startedAt.getMinutes() };
});

const clockRange = computed(() => {
  if (!taskTime.value) return undefined;
  return createAgendaTaskClockRange(taskTime.value, new Date());
});

const isValid = computed(() => {
  const range = clockRange.value;
  return range ? range.endedAt <= new Date() : false;
});

const endTime = computed(() => {
  if (!taskTime.value?.startTime || !clockRange.value) return undefined;
  return format(clockRange.value.endedAt, TIME_FORMAT);
});

const submit = (): void => {
  if (!taskTime.value || !isValid.value) return;
  modal.close(taskTime.value);
};
</script>

<style scoped lang="scss">
.task-time-modal {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  align-self: center;
  margin-inline: auto;
  overflow-x: clip;
}

.actions {
  min-width: 0;
}

.action {
  min-width: 0;
  flex: 1 1 0;
}
</style>
