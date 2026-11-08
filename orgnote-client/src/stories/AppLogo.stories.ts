import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import AppLogo from 'src/components/AppLogo.vue';

export default {
  component: AppLogo,
  title: 'Logo',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof AppLogo> = {
  args: {
    size: '80px',
    monochrome: false,
  },
  render: (args) => ({
    components: { StoryList, AppLogo },
    setup() {
      return { args };
    },
    template: `<app-logo v-bind="args" />`,
  }),
};
