import type { Meta, StoryObj } from '@storybook/vue3-vite';
import StatCard from 'src/components/StatCard.vue';

const meta: Meta<typeof StatCard> = {
  component: StatCard,
  title: 'Stat Card',
  tags: ['autodocs'],
  args: {
    label: 'Total Users',
    value: 1234,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  render: (args) => ({
    components: { StatCard },
    setup() {
      return { args };
    },
    template: '<stat-card v-bind="args" style="width: 200px;" />',
  }),
};

export const WithSlots: Story = {
  render: (args) => ({
    components: { StatCard },
    setup() {
      return { args };
    },
    template: `
      <stat-card style="width: 200px;">
        <template #value>
          <span style="color: var(--green);">99.9%</span>
        </template>
        <template #label>
          Uptime <span style="font-size: 0.8em; opacity: 0.7;">(Last 30 days)</span>
        </template>
      </stat-card>
    `,
  }),
};

export const LongValue: Story = {
  args: {
    label: 'Revenue',
    value: '$1,234,567.89',
  },
  render: (args) => ({
    components: { StatCard },
    setup() {
      return { args };
    },
    template: '<stat-card v-bind="args" style="width: 250px;" />',
  }),
};
