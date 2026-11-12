import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import ConfirmationModal from 'src/components/ConfirmationModal.vue';
import AppButton from 'src/components/AppButton.vue';

export default {
  component: ConfirmationModal,
  title: 'Confirmation modal',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof ConfirmationModal> = {
  args: {
    title: 'Some title',
    message: 'Some message',
    confirmText: 'Confirm text',
    cancelText: 'Cancel text',
    resolver: () => {},
  },
  render: (args) => ({
    components: { StoryList, ConfirmationModal, AppButton },
    setup() {
      return { args };
    },
    template: `<confirmation-modal v-bind="args" />`,
  }),
};
