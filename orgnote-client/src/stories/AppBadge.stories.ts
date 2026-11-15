import type { Meta, StoryObj } from '@storybook/vue3-vite';
import type { StyleSize, StyleVariant, ThemeVariable } from 'orgnote-api';
import AppBadge from 'src/components/AppBadge.vue';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

type ExtendedStyleVariant = StyleVariant | 'primary' | 'secondary' | 'accent' | 'success';
type AppBadgeArgs = {
  label?: string;
  icon?: string;
  variant?: ExtendedStyleVariant;
  color?: ThemeVariable;
  size?: StyleSize;
  rounded?: boolean;
  outline?: boolean;
};

const meta: Meta<AppBadgeArgs> = {
  component: AppBadge,
  title: 'App Badge',
  tags: ['autodocs'],
  args: {
    label: 'Badge',
    variant: 'plain',
    size: 'md',
  },
};

export default meta;

type Story = StoryObj<AppBadgeArgs>;

export const Default: Story = {
  render: (args) => ({
    components: { AppBadge },
    setup() {
      return { args };
    },
    template: '<app-badge v-bind="args" />',
  }),
};

export const WithIcon: Story = {
  args: {
    icon: 'check',
    size: 'sm',
    label: 'Success',
    variant: 'success',
  },
  render: (args) => ({
    components: { StoryList, AppBadge },
    setup() {
      const sizes: AppBadgeArgs['size'][] = ['xs', 'sm', 'md', 'lg'];
      const variants: AppBadgeArgs['variant'][] = [
        'success',
        'info',
        'warning',
        'danger',
        'primary',
        'secondary',
        'accent',
        'plain',
      ];

      const listItems = computed(() =>
        sizes.flatMap((size) =>
          variants.map((variant) => ({
            component: AppBadge,
            props: {
              ...args,
              size,
              variant,
              label: `${variant} / ${size}`,
            },
            description: `${variant} • ${size}`,
          })),
        ),
      );

      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const Rounded: Story = {
  args: {
    label: 'Rounded',
    rounded: true,
    variant: 'info',
  },
};

export const Outline: Story = {
  args: {
    label: 'Outline',
    outline: true,
    variant: 'warning',
  },
};

export const Sizes: Story = {
  render: (args) => ({
    components: { StoryList, AppBadge },
    setup() {
      const sizes = ['xs', 'sm', 'md', 'lg'];
      const listItems = computed(() =>
        sizes.map((size) => ({
          component: AppBadge,
          props: { ...args, size, label: `Size ${size}` },
          description: size,
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const Variants: Story = {
  render: (args) => ({
    components: { StoryList, AppBadge },
    setup() {
      const variants = [
        'plain',
        'primary',
        'secondary',
        'accent',
        'info',
        'success',
        'warning',
        'danger',
      ];
      const listItems = computed(() =>
        variants.map((variant) => ({
          component: AppBadge,
          props: { ...args, variant, label: variant },
          description: variant,
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};
