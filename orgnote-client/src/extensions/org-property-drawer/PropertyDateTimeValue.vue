<template>
  <app-flex class="property-value" start>
    <date-picker-popover :model-value="calendarDate" @update:model-value="onDateSelected">
      <template #trigger="{ open }">
        <inline-date-token
          :editable="!readonly"
          focus-tone="current"
          @mousedown.stop
          @activate="openDatePicker(open)"
        >
          {{ displayed }}
        </inline-date-token>
      </template>
    </date-picker-popover>
  </app-flex>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { OrgPropertyEntry } from 'orgnote-api';
import { I18N } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';
import DatePickerPopover from 'src/components/DatePickerPopover.vue';
import InlineDateToken from 'src/components/InlineDateToken.vue';
import { formatInactiveOrgDate, toCalendarDate } from './property-model';
import { truncateValue } from './property-value-utils';

const props = defineProps<{
  item: OrgPropertyEntry;
  readonly?: boolean;
}>();

const emit = defineEmits<{ set: [value: string] }>();
const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const calendarDate = computed(() => toCalendarDate(props.item.value));
const displayed = computed(() => truncateValue(props.item.value || t(I18N.EMPTY_VALUE_PLACEHOLDER)));

const openDatePicker = (open: () => void): void => {
  if (props.readonly) return;
  open();
};

const onDateSelected = (date: string | undefined): void => {
  if (props.readonly || !date) return;
  const formatted = formatInactiveOrgDate(date);
  if (formatted) emit('set', formatted);
};
</script>
