import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import AppCard from 'src/components/AppCard.vue';
import AppInput from 'src/components/AppInput.vue';

export default {
  component: AppInput,
  title: 'Input',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof AppInput> = {
  args: {
    modelValue: 'test',
    placeholder: 'placeholder',
    name: 'any name',
    type: 'text',
  },
  render: (args) => ({
    components: { StoryList, AppInput },
    setup() {
      return { args };
    },
    template: `<app-input v-bind="args" />`,
  }),
};

export const InputInsideCard: StoryObj<typeof AppInput> = {
  args: {
    modelValue: 'test',
    placeholder: 'placeholder',
    name: 'any name',
    type: 'text',
  },
  render: (args) => ({
    components: { StoryList, AppInput, AppCard },
    setup() {
      return { args };
    },
    template: `
    <app-card type="warning">
      <app-input v-bind="args" />
    </app-card>

    <br/>
    <app-card type="info">
      <app-input v-bind="args" />
    </app-card>

`,
  }),
};
