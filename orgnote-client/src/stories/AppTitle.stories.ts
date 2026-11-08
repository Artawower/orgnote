import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import { computed } from 'vue';
import AppTitle from 'src/components/AppTitle.vue';

export default {
  component: AppTitle,
  title: 'Typography/AppTitle',
  tags: ['autodocs'],
  args: {},
};

const levels = [1, 2, 3, 4, 5, 6];
const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];

export const Default: StoryObj<typeof AppTitle> = {
  args: {
    level: 1,
  },
  render: (args) => ({
    components: { StoryList, AppTitle },
    setup() {
      const listItems = computed(() => {
        return levels.map((level) => ({
          component: AppTitle,
          props: { ...args, level },
          description: `Level ${level}`,
          slots: { default: `Heading ${level}` },
        }));
      });

      return {
        args,
        listItems,
      };
    },
    template: `<story-list :items="listItems" />`,
  }),
};

export const Sizes: StoryObj<typeof AppTitle> = {
  args: {
    level: 1,
  },
  render: (args) => ({
    components: { StoryList, AppTitle },
    setup() {
      const listItems = computed(() => {
        return sizes.map((size) => ({
          component: AppTitle,
          props: { ...args, size },
          description: `Size ${size}`,
          slots: { default: `Title size ${size}` },
        }));
      });

      return {
        args,
        listItems,
      };
    },
    template: `<story-list :items="listItems" />`,
  }),
};
