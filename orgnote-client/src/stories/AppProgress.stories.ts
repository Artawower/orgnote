import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppProgress, { type AppProgressProps } from 'src/components/AppProgress.vue';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

const meta: Meta<AppProgressProps> = {
  component: AppProgress,
  title: 'App Progress',
  tags: ['autodocs'],
  args: {
    value: 75,
    max: 100,
    size: 'md',
    variant: 'accent',
  },
};

export default meta;

type Story = StoryObj<AppProgressProps>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    value: 75,
    showLabel: true,
    label: 'Storage used',
  },
};

export const LabelFormatPercent: Story = {
  args: {
    value: 42,
    showLabel: true,
    label: 'Progress',
    labelFormat: 'percent',
  },
};

export const LabelFormatValue: Story = {
  args: {
    value: 42,
    showLabel: true,
    label: 'Items',
    labelFormat: 'value',
  },
};

export const LabelFormatFraction: Story = {
  args: {
    value: 42,
    max: 100,
    showLabel: true,
    label: 'Downloaded',
    labelFormat: 'fraction',
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { StoryList, AppProgress },
    setup() {
      const sizes: AppProgressProps['size'][] = ['xs', 'sm', 'md', 'lg', 'xl'];
      const listItems = computed(() =>
        sizes.map((size) => ({
          component: AppProgress,
          props: { value: 60, size },
          description: `Size: ${size}`,
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const Variants: Story = {
  render: () => ({
    components: { StoryList, AppProgress },
    setup() {
      const variants: AppProgressProps['variant'][] = [
        'primary',
        'accent',
        'success',
        'warning',
        'danger',
        'info',
      ];
      const listItems = computed(() =>
        variants.map((variant) => ({
          component: AppProgress,
          props: { value: 70, variant, size: 'lg' as const },
          description: `Variant: ${variant}`,
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const AutoVariant: Story = {
  render: () => ({
    components: { StoryList, AppProgress },
    setup() {
      const values = [20, 50, 80];
      const listItems = computed(() =>
        values.map((value) => ({
          component: AppProgress,
          props: { value, autoVariant: true, showLabel: true, label: 'Auto color', size: 'lg' as const },
          description: `Value: ${value}%`,
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const StorageExample: Story = {
  args: {
    value: 1.35,
    max: 50,
    showLabel: true,
    label: 'Storage',
    labelFormat: 'fraction',
    size: 'lg',
    variant: 'accent',
  },
};
