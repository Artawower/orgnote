import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppDate from 'src/components/AppDate.vue';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

const meta: Meta<typeof AppDate> = {
  component: AppDate,
  title: 'App Date',
  tags: ['autodocs'],
  args: {
    date: new Date(),
    format: 'datetime',
    monospace: false,
  },
  argTypes: {
    date: { control: 'date' },
    format: {
      control: 'select',
      options: ['date', 'time', 'datetime', 'iso'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof AppDate>;

export const Default: Story = {
  render: (args) => ({
    components: { AppDate },
    setup() {
      return { args };
    },
    template: '<app-date v-bind="args" />',
  }),
};

export const Formats: Story = {
  render: (args) => ({
    components: { StoryList, AppDate },
    setup() {
      const formats = ['date', 'time', 'datetime', 'iso'] as const;
      const listItems = computed(() =>
        formats.map((format) => ({
          component: AppDate,
          props: { ...args, format },
          description: format,
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const Monospace: Story = {
  args: {
    monospace: true,
    format: 'iso',
  },
};
