<template>
  <span class="pretty-date" :class="toneClass">
    <slot>{{ label }}</slot>
  </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { format, isPast, isToday, isTomorrow, isYesterday } from 'date-fns';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';

type DateTone = 'overdue' | 'today' | 'tomorrow' | 'future' | 'past';

const props = withDefaults(
  defineProps<{
    date: Date;
    tone?: DateTone;
    dateFormat?: string;
  }>(),
  {
    tone: undefined,
    dateFormat: 'M/d/yyyy',
  },
);

const { t } = useI18n();

const autoTone = computed<DateTone>(() => {
  if (isToday(props.date)) return 'today';
  if (isTomorrow(props.date)) return 'tomorrow';
  if (isYesterday(props.date)) return 'past';
  if (isPast(props.date)) return 'overdue';
  return 'future';
});

const tone = computed<DateTone>(() => props.tone ?? autoTone.value);

const toneClass = computed(() => `tone-${tone.value}`);

const label = computed(() => {
  if (isToday(props.date)) return t(extensionI18nKeys.orgAgendaFilterToday);
  if (isTomorrow(props.date)) return t(extensionI18nKeys.orgAgendaFilterTomorrow);
  return format(props.date, props.dateFormat);
});
</script>

<style lang="scss" scoped>
.pretty-date {
  white-space: nowrap;

  &.tone-overdue {
    color: var(--red);
  }

  &.tone-today {
    color: var(--accent);
  }

  &.tone-tomorrow {
    color: var(--fg);
  }

  &.tone-future,
  &.tone-past {
    color: var(--fg-muted);
  }
}
</style>
