import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import AppDescription from 'src/components/AppDescription.vue';
import AppCard from 'src/components/AppCard.vue';

export default {
  component: AppDescription,
  title: 'Description',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof AppDescription> = {
  args: {
    text: 'any text',
    title: false,
    type: 'plain',
    padded: false,
  },
  render: (args) => ({
    components: { StoryList, AppDescription },
    setup() {
      return { args };
    },
    template: `<app-description v-bind="args" />`,
  }),
};

export const DescriptionInsideCard: StoryObj<typeof AppDescription> = {
  args: {
    text: 'any text',
    title: false,
    type: 'info',
    padded: false,
  },
  render: (args) => ({
    components: { StoryList, AppDescription, AppCard },
    setup() {
      return { args };
    },
    template: `
    <app-card type="info">
    <app-description v-bind="args" text="info description" type="info" />
    </app-card>

    <br />
    <app-card type="warning">
    <app-description v-bind="args" text="warning description" type="warning" />
    </app-card>
    
    <br />
    <app-card type="danger">
    <app-description v-bind="args" text="danger description" type="danger" />
    </app-card>
`,
  }),
};
