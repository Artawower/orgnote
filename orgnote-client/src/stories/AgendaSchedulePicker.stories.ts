import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';
import type { OrgRepeater } from 'org-mode-ast';
import DatePickerSheet from 'src/components/DatePickerSheet.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppBadge from 'src/components/AppBadge.vue';
import AgendaRepeatPicker from 'src/extensions/org-agenda/components/AgendaRepeatPicker.vue';

const meta = {
  title: 'Agenda/SchedulePicker',
  component: DatePickerSheet,
  tags: ['autodocs'],
} as Meta<typeof DatePickerSheet>;

export default meta;

type Story = StoryObj<typeof DatePickerSheet>;

const repeaterLabel = (repeater: OrgRepeater | undefined): string =>
  repeater ? `${repeater.type}${repeater.value}${repeater.unit}` : 'none';

export const RepeatedTask: Story = {
  render: () => ({
    components: { AgendaRepeatPicker, AppBadge, AppFlex, DatePickerSheet },
    setup() {
      const date = ref('2026-06-16');
      const repeater = ref<OrgRepeater | undefined>({ type: '+', value: 1, unit: 'd' });
      const summary = computed(() => `${date.value ?? 'no date'} · ${repeaterLabel(repeater.value)}`);
      return { date, repeater, summary };
    },
    template: `
      <app-flex column align-start gap="md">
        <app-badge :label="summary" color="accent" />
        <date-picker-sheet v-model="date" confirm-mode>
          <template #sections>
            <agenda-repeat-picker v-model="repeater" />
          </template>
        </date-picker-sheet>
      </app-flex>
    `,
  }),
};
