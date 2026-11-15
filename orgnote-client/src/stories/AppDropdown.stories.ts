import type { StoryObj } from '@storybook/vue3-vite';
import type { StyleVariant } from 'orgnote-api';
import AppDropdown from 'src/components/AppDropdown.vue';
import StoryList from './StoryList.vue';
import { computed } from 'vue';

interface Fruit {
  id: number;
  name: string;
}

const FRUITS: Fruit[] = [
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' },
  { id: 3, name: 'Cherry' },
  { id: 4, name: 'Dragonfruit' },
  { id: 5, name: 'Elderberry' },
];

const COLORS = ['Red', 'Green', 'Blue', 'Yellow', 'Purple'];

interface Args {
  options?: unknown[];
  optionLabel?: string;
  optionValue?: string | ((opt: unknown) => unknown);
  placeholder?: string;
  label?: string;
  type?: StyleVariant;
  disable?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  useInput?: boolean;
  taggable?: boolean;
}

export default {
  component: AppDropdown,
  title: 'App Dropdown',
  tags: ['autodocs'],
  args: {
    options: COLORS,
    placeholder: 'Select a color...',
    clearable: true,
    useInput: true,
  } satisfies Args,
  argTypes: {
    type: {
      control: 'select',
      options: [
        'plain',
        'info',
        'warning',
        'danger',
        'active',
        'clear',
        'link',
      ] satisfies StyleVariant[],
    },
  },
};

type Story = StoryObj<Args>;

const SimpleTemplate: Story = {
  render: (args) => ({
    components: { AppDropdown },
    setup() {
      return { args };
    },
    template: `<app-dropdown v-bind="args" />`,
  }),
};

export const Default: Story = {
  ...SimpleTemplate,
};

export const WithLabel: Story = {
  ...SimpleTemplate,
  args: {
    label: 'Color',
    placeholder: 'Pick one...',
  } satisfies Args,
};

export const Disabled: Story = {
  ...SimpleTemplate,
  args: {
    disable: true,
    placeholder: 'Disabled state',
  } satisfies Args,
};

export const Multiple: Story = {
  ...SimpleTemplate,
  args: {
    multiple: true,
    placeholder: 'Select multiple colors...',
  } satisfies Args,
};

export const NotClearable: Story = {
  ...SimpleTemplate,
  args: {
    clearable: false,
    placeholder: 'Cannot clear selection',
  } satisfies Args,
};

export const ObjectOptions: Story = {
  render: (args) => ({
    components: { AppDropdown },
    setup() {
      return { args };
    },
    template: `<app-dropdown v-bind="args" />`,
  }),
  args: {
    options: FRUITS,
    optionLabel: 'name',
    optionValue: (opt: unknown) => (opt as Fruit).id,
    label: 'Fruit',
    placeholder: 'Select a fruit...',
  } satisfies Args,
};

export const WithAppendSlot: Story = {
  render: () => ({
    components: { AppDropdown },
    template: `
      <app-dropdown
        :options="colors"
        placeholder="Search colors..."
      >
        <template #append>
          <span style="padding: 0 8px; color: var(--fg-muted);">🔍</span>
        </template>
      </app-dropdown>
    `,
    setup() {
      return { colors: COLORS };
    },
  }),
};

export const Taggable: Story = {
  ...SimpleTemplate,
  args: {
    taggable: true,
    placeholder: 'Type and press Enter to create...',
    clearable: false,
  },
};

export const AllTypes: Story = {
  render: () => ({
    components: { StoryList, AppDropdown },
    setup() {
      const types: StyleVariant[] = [
        'plain',
        'info',
        'warning',
        'danger',
        'active',
        'clear',
        'link',
      ];
      const listItems = computed(() =>
        types.map((type) => ({
          component: AppDropdown,
          props: { options: COLORS, clearable: true, type, placeholder: type, label: type },
          description: type,
        })),
      );
      return { listItems };
    },
    template: '<story-list :items="listItems" />',
  }),
};
