import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ProgressDots from 'src/components/onboarding/ProgressDots.vue';
import StoryList from 'src/stories/StoryList.vue';
import { computed } from 'vue';

interface ProgressDotsArgs {
  totalSteps: number;
  currentStep: number;
}

const meta: Meta<ProgressDotsArgs> = {
  component: ProgressDots,
  title: 'Progress Dots',
  tags: ['autodocs'],
  args: {
    totalSteps: 5,
    currentStep: 2,
  },
};

export default meta;

type Story = StoryObj<ProgressDotsArgs>;

export const Default: Story = {};

export const FirstStep: Story = {
  args: {
    totalSteps: 5,
    currentStep: 0,
  },
};

export const LastStep: Story = {
  args: {
    totalSteps: 5,
    currentStep: 4,
  },
};

export const AllStates: Story = {
  render: () => ({
    components: { StoryList, ProgressDots },
    setup() {
      const listItems = computed(() =>
        Array.from({ length: 5 }, (_, i) => ({
          component: ProgressDots,
          props: { totalSteps: 5, currentStep: i },
          description: `Step ${i + 1} of 5`,
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};

export const DifferentLengths: Story = {
  render: () => ({
    components: { StoryList, ProgressDots },
    setup() {
      const listItems = computed(() =>
        [3, 5, 7].map((totalSteps) => ({
          component: ProgressDots,
          props: { totalSteps, currentStep: Math.floor(totalSteps / 2) },
          description: `${totalSteps} steps, current: ${Math.floor(totalSteps / 2) + 1}`,
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};
