import AppIcon from '../components/AppIcon.vue';
import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

export default {
  component: AppIcon,
  title: 'Icon',
  tags: ['autodocs'],
  args: {},
};

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];

export const Default: StoryObj<typeof AppIcon> = {
  args: {
    name: 'folder',
  },
  render: (args) => ({
    components: { StoryList, AppIcon },
    setup() {
      const listItems = computed(() => {
        return sizes.map((size) => ({
          component: AppIcon,
          props: { ...args, size },
          description: size,
        }));
      });
      return { args, listItems };
    },
    template: `<story-list :items="listItems" />`,
  }),
};
