import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import SplashScreen from 'src/components/SplashScreen.vue';

export default {
  component: SplashScreen,
  title: 'Splash screen',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof SplashScreen> = {
  args: {},
  render: (args) => ({
    components: { StoryList, SplashScreen },
    setup() {
      return { args };
    },
    template: `<splash-screen v-bind="args" />`,
  }),
};
