import type { StoryObj } from '@storybook/vue3-vite';
import type { MenuAction } from 'orgnote-api';
import MenuList from 'src/components/MenuList.vue';

export default {
  component: MenuList,
  title: 'Menu List',
  tags: ['autodocs'],
  args: {},
};

const fileManagerActions: MenuAction[] = [
  { title: 'Open file manager', icon: 'folder', handler: () => {} },
  { title: 'Navigate agenda tasks', icon: 'sym_o_checklist', handler: () => {} },
];

const richActions: MenuAction[] = [
  { title: 'New note', icon: 'sym_o_add', handler: () => {} },
  { title: 'Open in editor', icon: 'sym_o_edit', handler: () => {} },
  { title: 'Share', icon: 'sym_o_share', handler: () => {} },
  { title: 'Delete', icon: 'sym_o_delete', handler: () => {} },
];

const minimalActions: MenuAction[] = [
  { title: 'Copy', handler: () => {} },
  { title: 'Paste', handler: () => {} },
];

export const Default: StoryObj = {
  args: { actions: fileManagerActions },
  render: (args) => ({
    components: { MenuList },
    setup: () => ({ args }),
    template: `
      <div style="width: 320px; background: var(--bg); border-radius: var(--card-radius); overflow: hidden;">
        <menu-list v-bind="args" @close="() => {}" />
      </div>
    `,
  }),
};

export const Rich: StoryObj = {
  args: { actions: richActions },
  render: (args) => ({
    components: { MenuList },
    setup: () => ({ args }),
    template: `
      <div style="width: 320px; background: var(--bg); border-radius: var(--card-radius); overflow: hidden;">
        <menu-list v-bind="args" @close="() => {}" />
      </div>
    `,
  }),
};

export const Minimal: StoryObj = {
  args: { actions: minimalActions },
  render: (args) => ({
    components: { MenuList },
    setup: () => ({ args }),
    template: `
      <div style="width: 240px; background: var(--bg); border-radius: var(--card-radius); overflow: hidden;">
        <menu-list v-bind="args" @close="() => {}" />
      </div>
    `,
  }),
};
