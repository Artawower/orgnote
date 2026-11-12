import type { Meta, StoryObj } from '@storybook/vue3-vite';
import MonochromeFace from 'src/components/MonochromeFace.vue';

const meta: Meta<typeof MonochromeFace> = {
  component: MonochromeFace,
  title: 'Monochrome Face',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MonochromeFace>;

export const Default: Story = {
  render: () => ({
    components: { MonochromeFace },
    template: '<monochrome-face>Monospace Content</monochrome-face>',
  }),
};

export const WithComplexContent: Story = {
  render: () => ({
    components: { MonochromeFace },
    template: `
      <monochrome-face>
        <span>Part 1</span> | <strong>Part 2</strong>
      </monochrome-face>
    `,
  }),
};
