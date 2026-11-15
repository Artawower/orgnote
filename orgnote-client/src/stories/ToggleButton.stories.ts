import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import ToggleButton from 'src/components/ToggleButton.vue';

export default {
  component: ToggleButton,
  title: 'Toggle button',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof ToggleButton> = {
  args: {},
  render: (args) => ({
    components: { StoryList, ToggleButton },
    setup() {
      return { args };
    },
    template: `<toggle-button v-bind="args" />`,
  }),
};
