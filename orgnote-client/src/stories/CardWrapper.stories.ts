import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import CardWrapper from 'src/components/CardWrapper.vue';

export default {
  component: CardWrapper,
  title: 'Card wrapper',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof CardWrapper> = {
  args: {
    border: false,
    padding: true,
    type: 'info',
  },
  render: (args) => ({
    components: { StoryList, CardWrapper },
    setup() {
      return { args };
    },
    template: `
    <card-wrapper v-bind="args">
      Info card
    </card-wrapper>

    <br/>
    <card-wrapper v-bind="args" type="warning">
      Warning card
    </card-wrapper>

    <br/>
    <card-wrapper v-bind="args" type="danger">
      Danger card
    </card-wrapper>
    
`,
  }),
};
