import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ActionButton from 'src/components/ActionButton.vue';
import NavTabs from 'src/components/NavTabs.vue';
import NavTab from 'src/components/NavTab.vue';

const meta = {
  component: NavTabs,
  title: 'Nav tabs',
  tags: ['autodocs'],
} satisfies Meta<typeof NavTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ActionButton, NavTabs, NavTab },
    template: `
      <nav-tabs active-tab-id="tab-3">
        <nav-tab icon="sym_o_folder" tab-id="tab-1">Tab 1</nav-tab>
        <nav-tab icon="sym_o_folder" tab-id="tab-2">Tab 2</nav-tab>
        <nav-tab icon="sym_o_folder" tab-id="tab-3" :active="true">Tab 3</nav-tab>
        <template #actions>
          <action-button icon="add" size="sm" />
        </template>
      </nav-tabs>
    `,
  }),
};
