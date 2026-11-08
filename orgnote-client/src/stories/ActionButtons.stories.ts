import type { StoryObj } from '@storybook/vue3-vite';
import ActionButton from 'src/components/ActionButton.vue';
import ActionButtons from 'src/components/ActionButtons.vue';
import AppIcon from 'src/components/AppIcon.vue';

export default {
  component: ActionButtons,
  title: 'Action Buttons',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof ActionButtons> = {
  args: {
    vertical: false,
    horizontal: true,
    position: 'left',
  },
  render: (args) => ({
    components: { ActionButtons, ActionButton, AppIcon },
    setup() {
      return { args };
    },
    template: `
        <action-buttons v-bind="args">
          <action-button icon="sym_o_add_circle" size="md" />
        </action-buttons>`,
  }),
};
