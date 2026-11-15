import type { Meta, StoryObj } from '@storybook/vue3-vite';
import type { ThemeVariable } from 'orgnote-api';
import AppLink from 'src/components/AppLink.vue';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

type AppLinkArgs = {
  href: string;
  label?: string;
  color?: ThemeVariable;
  external?: boolean;
  underline?: boolean;
};

const meta: Meta<AppLinkArgs> = {
  component: AppLink,
  title: 'App Link',
  tags: ['autodocs'],
  args: {
    href: 'https://example.com',
    label: 'Example Link',
    color: 'blue',
    external: true,
    underline: false,
  },
};

export default meta;

type Story = StoryObj<AppLinkArgs>;

export const Default: Story = {
  render: (args) => ({
    components: { AppLink },
    setup() {
      return { args };
    },
    template: '<app-link v-bind="args" />',
  }),
};

export const Underlined: Story = {
  args: {
    label: 'Always Underlined',
    underline: true,
  },
};

export const InternalLink: Story = {
  args: {
    href: '/settings',
    label: 'Internal Link',
    external: false,
  },
};

export const Colors: Story = {
  render: (args) => ({
    components: { StoryList, AppLink },
    setup() {
      const colors: ThemeVariable[] = [
        'blue',
        'green',
        'red',
        'yellow',
        'orange',
        'magenta',
        'cyan',
        'violet',
        'teal',
        'fg',
        'fg-muted',
        'accent',
      ];

      const listItems = computed(() =>
        colors.map((color) => ({
          component: AppLink,
          props: { ...args, color, label: color },
          description: color,
        })),
      );

      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const WithSlotContent: Story = {
  render: (args) => ({
    components: { AppLink },
    setup() {
      return { args };
    },
    template: '<app-link v-bind="args"><strong>Bold Link</strong> with custom content</app-link>',
  }),
};
