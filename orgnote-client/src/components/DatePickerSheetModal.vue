<template>
  <date-picker-sheet
    :model-value="modelValue"
    :selection-mode="selectionMode"
    :confirm-mode="confirmMode"
    :show-shortcuts="showShortcuts"
    @update:model-value="onUpdate"
    @confirm="onConfirm"
  >
    <template #header>
      <slot name="header" />
    </template>
    <template #sections>
      <slot name="sections" />
    </template>
    <template #footer="slotProps">
      <slot name="footer" v-bind="slotProps" />
    </template>
  </date-picker-sheet>
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';
import DatePickerSheet from './DatePickerSheet.vue';
import type {
  DatePickerSelection,
  DatePickerSelectionMode,
} from 'src/models/date-picker';

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

const modal = api.ui.useModal();

const closeWithSelection = (selection: DatePickerSelection): void => {
  modal.close({ selection: selection ?? null });
};

const onUpdate = (selection: DatePickerSelection): void => {
  if (props.confirmMode) return;
  closeWithSelection(selection);
};

const onConfirm = (selection: DatePickerSelection): void => {
  closeWithSelection(selection);
};
</script>
