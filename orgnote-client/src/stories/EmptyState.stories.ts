import type { DefineComponent } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import EmptyState, { type EmptyStateProps } from 'src/components/EmptyState.vue';
import AppButton from 'src/components/AppButton.vue';

const meta: Meta<DefineComponent<EmptyStateProps>> = {
  component: EmptyState as unknown as DefineComponent<EmptyStateProps>,
  title: 'Empty State',
  tags: ['autodocs'],
  args: {
    title: 'No Data Available',
    description: 'There are no items to display at the moment.',
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    icon: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  render: (args) => ({
    components: { EmptyState },
    setup() {
      return { args };
    },
    template: '<empty-state v-bind="args" />',
  }),
};

export const WithIcon: Story = {
  args: {
    icon: 'sym_o_inbox',
    title: 'Your Inbox is Empty',
    description: 'All caught up! New tasks will appear here.',
  },
  render: (args) => ({
    components: { EmptyState },
    setup() {
      return { args };
    },
    template: '<empty-state v-bind="args" />',
  }),
};

export const WithAction: Story = {
  args: {
    icon: 'sym_o_add_circle',
    title: 'Create Your First Project',
    description: 'Get started by creating a new project to organize your tasks.',
  },
  render: (args) => ({
    components: { EmptyState, AppButton },
    setup() {
      return { args };
    },
    template: `
      <empty-state v-bind="args">
        <app-button label="Create Project" color="primary" />
      </empty-state>
    `,
  }),
};

export const Minimal: Story = {
  args: {
    title: 'Nothing here',
    description: undefined,
    icon: undefined,
  },
  render: (args) => ({
    components: { EmptyState },
    setup() {
      return { args };
    },
    template: '<empty-state v-bind="args" />',
  }),
};
