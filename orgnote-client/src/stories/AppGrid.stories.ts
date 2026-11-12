import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppGrid from 'src/components/AppGrid.vue';

const meta: Meta<typeof AppGrid> = {
  component: AppGrid,
  title: 'App Grid',
  tags: ['autodocs'],
  args: {
    cols: 3,
    gap: 'md',
  },
  argTypes: {
    cols: { control: 'number' },
    gap: { control: 'text' },
    layout: { control: 'object' },
  },
};

export default meta;

type Story = StoryObj<typeof AppGrid>;

const colors = [
  'var(--red)',
  'var(--blue)',
  'var(--green)',
  'var(--orange)',
  'var(--purple)',
  'var(--cyan)',
];

const createItems = (count: number) =>
  Array.from(
    { length: count },
    (_, i) =>
      `<div style="background: ${colors[i % colors.length]}; color: white; padding: 1rem; border-radius: var(--border-radius-sm); display: flex; align-items: center; justify-content: center; font-weight: bold;">${i + 1}</div>`,
  ).join('');

export const Default: Story = {
  render: (args) => ({
    components: { AppGrid },
    setup() {
      return { args };
    },
    template: `
      <app-grid v-bind="args">
        ${createItems(12)}
      </app-grid>
    `,
  }),
};

export const Responsive: Story = {
  args: {
    cols: 1,
    responsive: {
      tablet: 2,
      desktop: 3,
    },
  },
  render: (args) => ({
    components: { AppGrid },
    setup() {
      return { args };
    },
    template: `
      <app-grid v-bind="args">
        ${createItems(12)}
      </app-grid>
    `,
  }),
};

export const CustomLayout: Story = {
  args: {
    cols: 3,
    layout: [
      { span: 3 }, // Header spanning all columns
      { span: 1, rowSpan: 2 }, // Sidebar
      { span: 2 }, // Main content 1
      { span: 2 }, // Main content 2
    ],
  },
  render: (args) => ({
    components: { AppGrid },
    setup() {
      return { args };
    },
    template: `
      <app-grid v-bind="args">
        <div style="background: var(--primary); color: white; padding: 1rem; border-radius: var(--border-radius-sm);">Header (Span 3)</div>
        <div style="background: var(--secondary); color: white; padding: 1rem; border-radius: var(--border-radius-sm);">Sidebar (Row Span 2)</div>
        <div style="background: var(--accent); color: white; padding: 1rem; border-radius: var(--border-radius-sm);">Content 1 (Span 2)</div>
        <div style="background: var(--info); color: white; padding: 1rem; border-radius: var(--border-radius-sm);">Content 2 (Span 2)</div>
      </app-grid>
    `,
  }),
};
