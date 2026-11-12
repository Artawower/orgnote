<template>
  <date-picker-popover
    v-if="resolvedDate"
    :model-value="datePickerModel"
    @update:model-value="handleSelect"
  >
    <template #trigger="{ open }">
      <app-date
        class="org-date"
        :class="{ active: !isInactiveTimestamp, inactive: isInactiveTimestamp, expired }"
        :date="resolvedDate"
        :label="currentNode.rawValue"
        focus-tone="current"
        format="date"
        :editable="!readonly"
        @open="open"
      />
    </template>
  </date-picker-popover>
  <inline-date-token v-if="!resolvedDate" class="org-date" :class="{ expired }">
    {{ currentNode.rawValue }}
  </inline-date-token>
</template>

<script lang="ts" setup>
import type { OrgNode } from 'org-mode-ast';
import { computed } from 'vue';
import { format } from 'date-fns';
import AppDate from 'src/components/AppDate.vue';
import DatePickerPopover from 'src/components/DatePickerPopover.vue';
import InlineDateToken from 'src/components/InlineDateToken.vue';
import { isoToSlashDate, parseOrgDate, updateOrgDateCalendar } from 'src/utils/org-date';

const props = defineProps<{
  node: OrgNode;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', newValue: string): void;
}>();

const currentNode = computed(() => props.node);
const parsedDate = computed(() => parseOrgDate(currentNode.value.rawValue));
const resolvedDate = computed(() => parsedDate.value?.date);
const datePickerModel = computed(
  () => resolvedDate.value && format(resolvedDate.value, 'yyyy-MM-dd'),
);
const isInactiveTimestamp = computed(() => parsedDate.value?.openingBracket === '[');
const expired = computed(() => {
  if (!parsedDate.value || isInactiveTimestamp.value) {
    return false;
  }

  return new Date() > parsedDate.value.comparisonDate;
});

const handleSelect = (isoDate: string | undefined): void => {
  if (!isoDate) return;
  const nextValue = updateOrgDateCalendar(currentNode.value.rawValue, isoToSlashDate(isoDate));
  if (!nextValue) return;

  emit('update', nextValue);
};
</script>

<style lang="scss" scoped>
.org-date {
  color: var(--fg-muted);
  font-weight: 500;

  &.active {
    color: var(--yellow);
  }

  &.inactive {
    color: var(--fg-muted);
  }

  &.expired {
    color: var(--red);
  }
}
</style>
