import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppFlex from 'src/components/AppFlex.vue';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

const meta: Meta<typeof AppFlex> = {
  component: AppFlex,
  title: 'App Flex',
  tags: ['autodocs'],
  args: {
    direction: 'row',
    justify: 'between',
    align: 'center',
    gap: 'md',
  },
  argTypes: {
    direction: {
      control: 'select',
      options: ['row', 'column', 'row-reverse', 'column-reverse'],
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
    },
    gap: {
      control: 'text',
    },
  },
};

export default meta;

type Story = StoryObj<typeof AppFlex>;

const Template: Story = {
  render: (args) => ({
    components: { AppFlex },
    setup() {
      return { args };
    },
    template: `
      <app-flex v-bind="args" style="background: var(--bg-alt); padding: 1rem;">
        <div style="background: var(--blue); color: white; padding: 0.5rem;">Item 1</div>
        <div style="background: var(--red); color: white; padding: 0.5rem;">Item 2</div>
        <div style="background: var(--accent); color: white; padding: 0.5rem;">Item 3</div>
      </app-flex>
    `,
  }),
};

export const Default: Story = {
  ...Template,
};

export const Column: Story = {
  ...Template,
  args: {
    direction: 'column',
    align: 'start',
  },
};

export const JustifyOptions: Story = {
  render: (args) => ({
    components: { StoryList, AppFlex },
    setup() {
      const options = ['start', 'center', 'end', 'between', 'around', 'evenly'] as const;
      const listItems = computed(() =>
        options.map((justify) => ({
          component: AppFlex,
          props: { ...args, justify },
          description: justify,
          slots: {
            default: `
              <div style="background: var(--primary); width: 30px; height: 30px;"></div>
              <div style="background: var(--secondary); width: 30px; height: 30px;"></div>
              <div style="background: var(--accent); width: 30px; height: 30px;"></div>
            `,
          },
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const GapSizes: Story = {
  render: (args) => ({
    components: { StoryList, AppFlex },
    setup() {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
      const listItems = computed(() =>
        sizes.map((gap) => ({
          component: AppFlex,
          props: { ...args, gap, justify: 'start' },
          description: gap,
          slots: {
            default: `
              <div style="background: var(--primary); width: 30px; height: 30px;"></div>
              <div style="background: var(--secondary); width: 30px; height: 30px;"></div>
            `,
          },
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const RowReverse: Story = {
  ...Template,
  args: {
    rowReverse: true,
    justify: 'start',
  },
};

export const ColumnReverse: Story = {
  ...Template,
  args: {
    columnReverse: true,
    align: 'start',
  },
};

export const DirectionOptions: Story = {
  render: (args) => ({
    components: { StoryList, AppFlex },
    setup() {
      const options = ['row', 'column', 'row-reverse', 'column-reverse'] as const;
      const listItems = computed(() =>
        options.map((direction) => ({
          component: AppFlex,
          props: { ...args, direction, justify: 'start', align: 'start' },
          description: direction,
          slots: {
            default: `
              <div style="background: var(--primary); padding: 0.5rem; color: white;">1</div>
              <div style="background: var(--secondary); padding: 0.5rem; color: white;">2</div>
              <div style="background: var(--accent); padding: 0.5rem; color: white;">3</div>
            `,
          },
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};
