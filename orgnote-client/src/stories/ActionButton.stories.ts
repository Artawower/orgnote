import type { StoryObj } from '@storybook/vue3-vite';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

export default {
  component: ActionButton,
  title: 'Action Button',
  tags: ['autodocs'],
  args: {},
};

interface ActionButtonStoryArgs {
  icon?: string;
  active?: boolean;
  color?: string;
  hoverColor?: string;
  hoverBackground?: boolean;
  outline?: boolean;
  fireIcon?: string;
  fireColor?: string;
  alignment?: string;
  variant?: string;
}

type Story = StoryObj<ActionButtonStoryArgs>;

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];

export const Default: Story = {
  args: {
    icon: 'folder',
    active: true,
    color: 'fg-muted',
    hoverColor: 'red',
    outline: false,
  },
  render: (args) => ({
    components: { StoryList, ActionButton, AppIcon },
    setup() {
      const listItems = computed(() => {
        return sizes.map((size) => ({
          component: ActionButton,
          props: { ...args, size },
          description: size,
        }));
      });

      return {
        args,
        listItems,
      };
    },
    template: `<story-list :items="listItems" />`,
  }),
};

export const WithFireIcon: Story = {
  args: {
    icon: 'sym_o_expand_content',
    fireIcon: 'sym_o_collapse_content',
    fireColor: 'red',
  },
  render: (args) => ({
    components: { StoryList, ActionButton, AppIcon },
    setup() {
      const listItems = computed(() => {
        return sizes.map((size) => ({
          component: ActionButton,
          props: { ...args, size },
          description: size,
        }));
      });
      return { args, listItems };
    },
    template: `<story-list :items="listItems" />`,
  }),
};

export const WithText: Story = {
  args: {
    icon: 'sym_o_expand_content',
    fireIcon: 'sym_o_collapse_content',
    fireColor: 'red',
  },
  render: (args) => ({
    components: { StoryList, ActionButton, AppIcon },
    setup() {
      const listItems = computed(() => {
        return sizes.map((size, i) => ({
          component: ActionButton,
          props: { ...args, size },
          description: size,
          slots: { text: `Text ${i}` },
        }));
      });
      return { args, listItems };
    },
    template: `<story-list :items="listItems" />`,
  }),
};

export const WithAlignment: Story = {
  args: {
    icon: 'sym_o_expand_content',
    alignment: 'space-between',
    outline: true,
  },
  render: (args) => ({
    components: { StoryList, ActionButton, AppIcon },
    setup() {
      const listItems = computed(() => {
        return sizes.map((size, i) => ({
          component: ActionButton,
          props: { ...args, size, style: 'width: 200px' },
          description: size,
          slots: { text: `Text ${i}` },
        }));
      });
      return { args, listItems };
    },
    template: `<story-list :items="listItems" />`,
  }),
};

export const TextVariant: Story = {
  args: {
    icon: 'sym_o_add',
    color: 'fg-muted',
    variant: 'text',
    alignment: 'left',
  },
  render: (args) => ({
    components: { ActionButton, AppFlex },
    setup() {
      return { args };
    },
    template: `
      <app-flex column align-start gap="md">
        <action-button v-bind="args">
          <template #text>Add property</template>
        </action-button>
        <action-button v-bind="args" icon="sym_o_tune" color="fg">
          <template #text>Properties</template>
        </action-button>
        <action-button v-bind="args" :icon="undefined">
          <template #text>Text-only action</template>
        </action-button>
      </app-flex>
    `,
  }),
};

export const IconColorHover: Story = {
  args: {
    icon: 'sym_o_close',
    color: 'fg-muted',
    hoverColor: 'fg',
    hoverBackground: false,
  },
  render: (args) => ({
    components: { StoryList, ActionButton },
    setup() {
      const listItems = computed(() => {
        return sizes.map((size) => ({
          component: ActionButton,
          props: { ...args, size },
          description: size,
        }));
      });
      return { listItems };
    },
    template: `<story-list :items="listItems" />`,
  }),
};
