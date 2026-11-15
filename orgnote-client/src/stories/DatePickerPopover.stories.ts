import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import ActionButton from 'src/components/ActionButton.vue';
import AppBadge from 'src/components/AppBadge.vue';
import AppFlex from 'src/components/AppFlex.vue';
import DatePickerPopover from 'src/components/DatePickerPopover.vue';
import type {
  DatePickerSelection,
  DatePickerSelectionMode,
} from 'src/models/date-picker';

interface DatePickerPopoverStoryArgs {
  modelValue: DatePickerSelection;
  selectionMode: DatePickerSelectionMode;
}

const meta = {
  title: 'Forms/DatePickerPopover',
  component: DatePickerPopover,
  tags: ['autodocs'],
  args: {
    modelValue: '2026-05-14',
    selectionMode: 'single',
  },
} as Meta<DatePickerPopoverStoryArgs>;

export default meta;

type Story = StoryObj<DatePickerPopoverStoryArgs>;

const renderPicker: Story['render'] = (args) => ({
  components: { ActionButton, AppBadge, AppFlex, DatePickerPopover },
  setup() {
    const selection = ref<DatePickerSelection>(args.modelValue);
    return { args, selection };
  },
  template: `
    <app-flex column align-start gap="md">
      <app-badge :label="JSON.stringify(selection)" color="accent" />
      <date-picker-popover
        v-model="selection"
        :selection-mode="args.selectionMode"
        confirm-mode
      >
        <template #trigger="{ open }">
          <action-button icon="sym_o_calendar_month" size="sm" @click="open" />
        </template>
      </date-picker-popover>
    </app-flex>
  `,
});

export const Single: Story = {
  render: renderPicker,
};

export const Range: Story = {
  args: {
    modelValue: { from: '2026-05-14', to: '2026-05-18' },
    selectionMode: 'range',
  },
  render: renderPicker,
};

export const Both: Story = {
  args: {
    modelValue: '2026-05-14',
    selectionMode: 'both',
  },
  render: renderPicker,
};
