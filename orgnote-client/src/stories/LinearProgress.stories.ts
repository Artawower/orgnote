import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import LinearProgress from 'src/components/LinearProgress.vue';

export default {
  component: LinearProgress,
  title: 'Linear Progress',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof LinearProgress> = {
  args: {
    color: 'accent',
  },
  render: (args) => ({
    components: { StoryList, LinearProgress },
    setup() {
      return { args };
    },
    template: `<linear-progress v-bind="args" />`,
  }),
};
