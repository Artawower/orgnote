<template>
  <inline-date-token
    class="app-date"
    :editable="isEditable"
    :monospace="props.monospace"
    :focus-tone="props.focusTone"
    @activate="handleOpenPicker"
  >
    {{ displayedValue }}
  </inline-date-token>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import InlineDateToken from './InlineDateToken.vue';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    date: Date | number | string;
    format?: 'date' | 'time' | 'datetime' | 'iso';
    monospace?: boolean;
    editable?: boolean;
    label?: string;
    focusTone?: 'none' | 'accent' | 'current';
  }>(),
  {
    format: 'datetime',
    monospace: false,
    editable: false,
    label: undefined,
    focusTone: 'accent',
  },
);

const emit = defineEmits<{
  (e: 'open'): void;
}>();

const dateObj = computed(() => new Date(props.date));
const isValidDate = computed(() => !Number.isNaN(dateObj.value.getTime()));
const isEditable = computed(() => props.editable && isValidDate.value);

const formattedDate = computed(() => {
  const d = dateObj.value;
  if (Number.isNaN(d.getTime())) {
    return t(I18N.INVALID_DATE);
  }

  const formatters = {
    time: () => d.toLocaleTimeString(),
    date: () => d.toLocaleDateString(),
    iso: () => d.toISOString(),
    datetime: () => d.toLocaleString(),
  };

  return formatters[props.format]();
});

const displayedValue = computed(() => props.label ?? formattedDate.value);

const handleOpenPicker = (): void => {
  if (!isEditable.value) {
    return;
  }

  emit('open');
};
</script>

<style lang="scss" scoped>
.app-date {
  @include fontify(var(--font-size-sm), normal, var(--fg-muted));
  padding: 0;
}
</style>
