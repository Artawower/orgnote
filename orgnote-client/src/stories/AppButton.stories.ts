import type { Meta, StoryObj } from '@storybook/vue3-vite';
import type { StyleVariant } from 'orgnote-api';
import AppButton from 'src/components/AppButton.vue';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonArgs {
  type?: StyleVariant;
  outline?: boolean;
  disabled?: boolean;
  size?: ButtonSize;
}

const meta: Meta<ButtonArgs> = {
  component: AppButton,
  title: 'Buttons',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'] satisfies ButtonSize[],
    },
  },
  args: {
    type: 'info',
    outline: false,
    size: 'md',
  },
};

export default meta;

type Story = StoryObj<ButtonArgs>;

export const Default: Story = {
  render: (args) => ({
    components: { AppButton },
    setup() {
      return { args };
    },
    template: '<app-button v-bind="args">Click</app-button>',
  }),
};

export const Outlined: Story = {
  args: { outline: true },
  render: (args) => ({
    components: { AppButton },
    setup() {
      return { args };
    },
    template: '<app-button v-bind="args">Click</app-button>',
  }),
};

export const Link: Story = {
  args: { type: 'link' },
  render: (args) => ({
    components: { AppButton },
    setup() {
      return { args };
    },
    template: '<app-button v-bind="args">Skip setup</app-button>',
  }),
};

export const LinkDisabled: Story = {
  args: { type: 'link', disabled: true },
  render: (args) => ({
    components: { AppButton },
    setup() {
      return { args };
    },
    template: '<app-button v-bind="args">Skip setup</app-button>',
  }),
};

export const AllSizes: Story = {
  render: () => ({
    components: { AppButton },
    setup() {
      const sizes: { size: ButtonSize; label: string }[] = [
        { size: 'xs', label: 'XSmall' },
        { size: 'sm', label: 'Small' },
        { size: 'md', label: 'Medium' },
        { size: 'lg', label: 'Large' },
      ];
      return { sizes };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <app-button v-for="s in sizes" :key="s.size" type="active" :size="s.size">
          {{ s.label }}
        </app-button>
      </div>
    `,
  }),
};

export const AllTypes: Story = {
  render: () => ({
    components: { AppButton },
    setup() {
      const types: { type: StyleVariant; label: string }[] = [
        { type: 'plain', label: 'Plain' },
        { type: 'info', label: 'Info' },
        { type: 'active', label: 'Active' },
        { type: 'warning', label: 'Warning' },
        { type: 'danger', label: 'Danger' },
        { type: 'link', label: 'Skip setup' },
      ];
      return { types };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <app-button v-for="item in types" :key="item.type" :type="item.type">
          {{ item.label }}
        </app-button>
      </div>
    `,
  }),
};
