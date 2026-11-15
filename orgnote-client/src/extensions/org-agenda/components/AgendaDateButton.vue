<template>
  <date-picker-popover v-model="model">
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
          <span :class="toneClass">{{ dateLabel }}</span>
        </template>
      </action-button>
    </template>
  </date-picker-popover>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { isPast, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import ActionButton from 'src/components/ActionButton.vue';
import DatePickerPopover from 'src/components/DatePickerPopover.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { formatOrgDateLabel } from 'src/utils/format-org-date';

type DateTone = 'overdue' | 'today' | 'tomorrow' | 'future' | 'past';

const model = defineModel<string | undefined>();
const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const dateLabel = computed(() => (model.value ? formatOrgDateLabel(model.value, t) : ''));

const tone = computed<DateTone | null>(() => {
  if (!model.value) return null;
  const date = parseISO(model.value);
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  if (isYesterday(date)) return 'past';
  if (isPast(date)) return 'overdue';
  return 'future';
});

const toneClass = computed(() => (tone.value ? `tone-${tone.value}` : ''));
</script>

<style lang="scss" scoped>
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
