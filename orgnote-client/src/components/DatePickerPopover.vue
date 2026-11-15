<template>
  <app-popover ref="popoverRef" :breakpoint="0" @closed="onPopoverClosed">
    <template #default="{ toggle }">
      <slot name="trigger" :open="handleOpen.bind(null, toggle)" />
    </template>
    <template #content>
      <date-picker-sheet
        :model-value="modelValue"
        :selection-mode="selectionMode"
        :confirm-mode="confirmMode"
        :show-shortcuts="showShortcuts"
        @update:model-value="onUpdate"
        @confirm="onConfirm"
      >
        <template v-if="slots.header" #header>
          <slot name="header" />
        </template>
        <template #sections>
          <slot name="sections" />
        </template>
        <template v-if="slots.footer" #footer="slotProps">
          <slot name="footer" v-bind="slotProps" />
        </template>
      </date-picker-sheet>
    </template>
  </app-popover>
</template>

<script lang="ts" setup generic="TMode extends DatePickerSelectionMode = 'single'">
import { defineComponent, h, ref, useSlots, type Slots } from 'vue';
import { to } from 'orgnote-api/utils';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import AppPopover from 'src/components/AppPopover.vue';
import DatePickerSheet from 'src/components/DatePickerSheet.vue';
import DatePickerSheetModal from 'src/components/DatePickerSheetModal.vue';
import type {
  DatePickerSelection,
  DatePickerSelectionForMode,
  DatePickerSelectionMode,
} from 'src/models/date-picker';

type DateSheetResult = { selection: DatePickerSelection | null } | undefined;
type SelectionValue = DatePickerSelectionForMode<TMode>;

const props = withDefaults(
  defineProps<{
    modelValue?: SelectionValue;
    selectionMode?: TMode;
    confirmMode?: boolean;
    showShortcuts?: boolean;
  }>(),
  {
    confirmMode: false,
    showShortcuts: true,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: SelectionValue];
  confirm: [value: SelectionValue];
  closed: [];
}>();

const slots = useSlots();
const popoverRef = ref<InstanceType<typeof AppPopover> | null>(null);
const isOpening = ref(false);
const isClosingWithConfirm = ref(false);
const { desktopBelow } = api.ui.useScreenDetection();

const blurActiveElement = (): void => {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return;
  activeElement.blur();
};

const sheetSlots = (): Pick<Slots, 'header' | 'sections' | 'footer'> => ({
  header: slots.header,
  sections: slots.sections,
  footer: slots.footer,
});

const createMobileSheet = () =>
  defineComponent({
    name: 'DatePickerPopoverMobileSheet',
    setup: () => () =>
      h(
        DatePickerSheetModal,
        {
          modelValue: props.modelValue,
          selectionMode: props.selectionMode,
          confirmMode: props.confirmMode,
          showShortcuts: props.showShortcuts,
        },
        sheetSlots(),
      ),
  });

const openMobileSheet = async (): Promise<void> => {
  if (isOpening.value) return;
  isOpening.value = true;
  blurActiveElement();
  const result = await to(() =>
    api.ui.useModal().open<DateSheetResult>(createMobileSheet(), {
      mini: true,
    }),
  )();
  isOpening.value = false;

  if (result.isErr()) {
    reporter.reportError(result.error);
  }
  if (result.isErr() || !result.value) {
    emit('closed');
    return;
  }
  const value = toSelectionValue(result.value.selection ?? undefined);
  emit('update:modelValue', value);
  emit('confirm', value);
};

const handleOpen = (toggle: () => void): void => {
  if (desktopBelow.value) {
    void openMobileSheet();
    return;
  }

  toggle();
};

const toSelectionValue = (value: DatePickerSelection): SelectionValue => value as SelectionValue;

const onUpdate = (value: DatePickerSelection): void => {
  emit('update:modelValue', toSelectionValue(value));
  if (!props.confirmMode) popoverRef.value?.close();
};

const onConfirm = (value: DatePickerSelection): void => {
  isClosingWithConfirm.value = true;
  popoverRef.value?.close();
  emit('confirm', toSelectionValue(value));
};

const onPopoverClosed = (): void => {
  if (isClosingWithConfirm.value) {
    isClosingWithConfirm.value = false;
    return;
  }
  emit('closed');
};
</script>
