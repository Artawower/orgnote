import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { addDays, subDays } from 'date-fns';
import PrettyDate from 'src/components/PrettyDate.vue';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

interface PrettyDateStoryArgs {
  date: Date;
  tone?: 'overdue' | 'today' | 'tomorrow' | 'future' | 'past';
  dateFormat?: string;
}

const meta = {
  component: PrettyDate,
  title: 'Pretty Date',
  tags: ['autodocs'],
  args: {
    date: new Date(),
    dateFormat: 'M/d/yyyy',
  },
  argTypes: {
    date: { control: 'date' },
    tone: {
      control: 'select',
      options: ['overdue', 'today', 'tomorrow', 'future', 'past'],
    },
  },
} as Meta<PrettyDateStoryArgs>;

export default meta;

type Story = StoryObj<PrettyDateStoryArgs>;

export const Default: Story = {
  render: (args) => ({
    components: { PrettyDate },
    setup() {
      return { args };
    },
    template: '<pretty-date v-bind="args" />',
  }),
};

export const Tones: Story = {
  render: (args) => ({
    components: { StoryList, PrettyDate },
    setup() {
      const today = new Date();
      const items = computed(() => [
        {
          component: PrettyDate,
          props: { ...args, date: subDays(today, 2), tone: 'overdue' },
          description: 'overdue',
        },
        {
          component: PrettyDate,
          props: { ...args, date: today, tone: 'today' },
          description: 'today',
        },
        {
          component: PrettyDate,
          props: { ...args, date: addDays(today, 1), tone: 'tomorrow' },
          description: 'tomorrow',
        },
        {
          component: PrettyDate,
          props: { ...args, date: addDays(today, 5), tone: 'future' },
          description: 'future',
        },
        {
          component: PrettyDate,
          props: { ...args, date: subDays(today, 1), tone: 'past' },
          description: 'past',
        },
      ]);
      return { items };
    },
    template: '<story-list :items="items" />',
  }),
};
