import AppAvatar from '../components/AppAvatar.vue';
import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

export default {
  component: AppAvatar,
  title: 'Avatar',
  tags: ['autodocs'],
  args: {},
};

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

export const WithImage: StoryObj<typeof AppAvatar> = {
  args: {
    url: 'https://avatars.githubusercontent.com/u/26901987?v=4',
  },
  render: (args) => ({
    components: { StoryList, AppAvatar },
    setup() {
      const listItems = computed(() => {
        return sizes.map((size) => ({
          component: AppAvatar,
          props: { ...args, size },
          description: `Size: ${size}`,
        }));
      });
      return { args, listItems };
    },
    template: `<story-list :items="listItems" title="Avatar with image" />`,
  }),
};

export const Fallback: StoryObj<typeof AppAvatar> = {
  args: {
    url: undefined,
  },
  render: (args) => ({
    components: { StoryList, AppAvatar },
    setup() {
      const listItems = computed(() => {
        return sizes.map((size) => ({
          component: AppAvatar,
          props: { ...args, size },
          description: `Size: ${size} (no image)`,
        }));
      });
      return { args, listItems };
    },
    template: `<story-list :items="listItems" title="Avatar fallback (anonymous user)" />`,
  }),
};
