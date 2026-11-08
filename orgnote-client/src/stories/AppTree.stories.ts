import type { StoryObj } from '@storybook/vue3-vite';
import AppTree from 'src/components/AppTree.vue';
import { ref } from 'vue';

export default {
  component: AppTree,
  title: 'Tree',
  tags: ['autodocs'],
};

const simpleNodes = [
  { id: '1', label: 'Node 1' },
  { id: '2', label: 'Node 2' },
  { id: '3', label: 'Node 3' },
];

const nestedNodes = [
  {
    id: '1',
    label: 'Documents',
    icon: 'sym_o_folder',
    children: [
      { id: '1-1', label: 'Work', icon: 'sym_o_folder' },
      { id: '1-2', label: 'Personal', icon: 'sym_o_folder' },
    ],
  },
  {
    id: '2',
    label: 'Images',
    icon: 'sym_o_folder',
    children: [
      { id: '2-1', label: 'Vacation', icon: 'sym_o_image' },
      { id: '2-2', label: 'Family', icon: 'sym_o_image' },
    ],
  },
  { id: '3', label: 'Notes.org', icon: 'sym_o_draft' },
];

const tocNodes = [
  {
    id: '1',
    label: 'Introduction',
    children: [
      { id: '1-1', label: 'Overview' },
      { id: '1-2', label: 'Getting Started' },
    ],
  },
  {
    id: '2',
    label: 'Installation',
    children: [
      { id: '2-1', label: 'Requirements' },
      { id: '2-2', label: 'Setup' },
    ],
  },
  { id: '3', label: 'Configuration' },
  { id: '4', label: 'API Reference' },
];

export const Simple: StoryObj<typeof AppTree> = {
  args: {
    nodes: simpleNodes,
  },
};

export const Nested: StoryObj<typeof AppTree> = {
  args: {
    nodes: nestedNodes,
    defaultExpandAll: true,
  },
};

export const TableOfContents: StoryObj<typeof AppTree> = {
  args: {
    nodes: tocNodes,
    defaultExpandAll: true,
  },
  render: (args) => ({
    components: { AppTree },
    setup() {
      const selected = ref<string | null>(null);
      const lastClicked = ref<string | null>(null);
      const handleClick = (node: { id: string; label: string }) => {
        lastClicked.value = node.label;
      };
      return { args, selected, lastClicked, handleClick };
    },
    template: `
      <div class="story-tree-container">
        <p v-if="lastClicked" class="story-tree-info">Clicked: {{ lastClicked }}</p>
        <app-tree 
          v-bind="args" 
          v-model:selected="selected"
          @node-click="handleClick"
        />
      </div>
    `,
  }),
};

export const WithSelection: StoryObj<typeof AppTree> = {
  args: {
    nodes: nestedNodes,
    defaultExpandAll: true,
  },
  render: (args) => ({
    components: { AppTree },
    setup() {
      const selected = ref<string | null>('2-1');
      return { args, selected };
    },
    template: `
      <div class="story-tree-container">
        <p class="story-tree-info">Selected: {{ selected }}</p>
        <app-tree v-bind="args" v-model:selected="selected" />
      </div>
    `,
  }),
};
