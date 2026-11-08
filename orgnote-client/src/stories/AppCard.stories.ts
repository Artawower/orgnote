import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import AppCard from 'src/components/AppCard.vue';

export default {
  component: AppCard,
  title: 'Card',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof AppCard> = {
  args: {
    title: 'Title',
    bordered: false,
    outline: false,
    type: 'info',
  },
  render: (args) => ({
    components: { StoryList, AppCard },
    setup() {
      return { args };
    },
    template: `<app-card v-bind="args">
    <template #cardTitle>Title Template</template>
    Info card
    </app-card>`,
  }),
};
