import type { Meta, StoryObj } from '@storybook/vue3-vite';
import type { DefineComponent } from 'vue';
import { ref } from 'vue';
import AppSegmentedControl from 'src/components/AppSegmentedControl.vue';
import type { SegmentOption } from 'src/components/app-segmented-control.types';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const MODE_OPTIONS: SegmentOption[] = [
  { value: 'focus', label: 'Focus' },
  { value: 'stopwatch', label: 'Stopwatch' },
];

const TAB_OPTIONS: SegmentOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const meta: Meta = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: AppSegmentedControl as unknown as DefineComponent<any>,
  title: 'App Segmented Control',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'] satisfies Size[],
    },
    disabled: { control: 'boolean' },
  },
  args: {
    size: 'md',
    disabled: false,
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: (args) => ({
    components: { AppSegmentedControl },
    setup() {
      const value = ref('active');
      return { args, value, TAB_OPTIONS };
    },
    template: `
      <app-segmented-control
        v-model="value"
        :options="TAB_OPTIONS"
        :size="args.size"
        :disabled="args.disabled"
      />
    `,
  }),
};

export const AllSizes: Story = {
  render: () => ({
    components: { AppSegmentedControl },
    setup() {
      const sizes: { size: Size; value: ReturnType<typeof ref<string>> }[] = [
        { size: 'xs', value: ref('focus') },
        { size: 'sm', value: ref('focus') },
        { size: 'md', value: ref('focus') },
        { size: 'lg', value: ref('focus') },
      ];
      return { sizes, MODE_OPTIONS };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
        <div v-for="s in sizes" :key="s.size" style="display: flex; align-items: center; gap: 16px;">
          <span style="width: 20px; font-size: 12px; color: gray;">{{ s.size }}</span>
          <app-segmented-control
            v-model="s.value.value"
            :options="MODE_OPTIONS"
            :size="s.size"
          />
        </div>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { AppSegmentedControl },
    setup() {
      const value = ref('active');
      return { value, TAB_OPTIONS };
    },
    template: `
      <app-segmented-control
        v-model="value"
        :options="TAB_OPTIONS"
        disabled
      />
    `,
  }),
};

export const ThreeOptions: Story = {
  render: () => ({
    components: { AppSegmentedControl },
    setup() {
      const value = ref('day');
      const options: SegmentOption[] = [
        { value: 'day', label: 'Day' },
        { value: 'week', label: 'Week' },
        { value: 'month', label: 'Month' },
      ];
      return { value, options };
    },
    template: `
      <app-segmented-control v-model="value" :options="options" />
    `,
  }),
};
