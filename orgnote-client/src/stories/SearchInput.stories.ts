import type { Meta, StoryObj } from '@storybook/vue3-vite';
import type { StyleSize } from 'orgnote-api';
import StoryList from './StoryList.vue';
import SearchInput from 'src/components/SearchInput.vue';
import ActionButton from 'src/components/ActionButton.vue';
import { computed } from 'vue';

interface SearchInputStoryArgs {
  placeholder?: string;
  icon?: string;
  clearable?: boolean;
  size?: StyleSize;
  appearance?: 'flat' | 'field' | 'glass';
}

const meta = {
  component: SearchInput,
  title: 'Search input',
  tags: ['autodocs'],
  args: {},
} satisfies Meta<SearchInputStoryArgs>;

export default meta;

type Story = StoryObj<SearchInputStoryArgs>;

export const Default: Story = {
  args: {
    placeholder: 'Search...',
    clearable: true,
    size: 'sm',
  },
  render: (args) => ({
    components: { SearchInput },
    setup() {
      return { args };
    },
    template: `<search-input v-bind="args" />`,
  }),
};

export const WithIcon: Story = {
  args: {
    placeholder: 'Search...',
    icon: 'search',
    clearable: true,
    size: 'sm',
  },
  render: (args) => ({
    components: { SearchInput },
    setup() {
      return { args };
    },
    template: `<search-input v-bind="args" />`,
  }),
};

export const FieldAppearance: Story = {
  args: {
    placeholder: 'Search...',
    icon: 'search',
    appearance: 'field',
    clearable: true,
  },
  render: (args) => ({
    components: { SearchInput },
    setup() {
      return { args };
    },
    template: `
      <div style="padding: 24px; background: var(--bg-secondary);">
        <search-input v-bind="args" />
      </div>
    `,
  }),
};

export const GlassAppearance: Story = {
  args: {
    placeholder: 'Search...',
    icon: 'search',
    appearance: 'glass',
    clearable: true,
  },
  render: (args) => ({
    components: { SearchInput },
    setup() {
      return { args };
    },
    template: `
      <div style="padding: 24px; background: var(--bg-secondary);">
        <search-input v-bind="args" />
      </div>
    `,
  }),
};

export const Appearances: Story = {
  render: () => ({
    components: { StoryList, SearchInput },
    setup() {
      const appearances = ['flat', 'field', 'glass'] as const;
      const listItems = computed(() =>
        appearances.map((appearance) => ({
          component: SearchInput,
          props: { placeholder: `${appearance} appearance`, icon: 'search', appearance },
          description: appearance,
        })),
      );
      return { listItems };
    },
    template: `
      <div style="padding: 24px; background: var(--bg-secondary);">
        <story-list :items="listItems" />
      </div>
    `,
  }),
};

export const WithActions: Story = {
  args: {
    placeholder: 'Type command...',
    icon: 'keyboard_arrow_right',
    clearable: false,
  },
  render: (args) => ({
    components: { SearchInput, ActionButton },
    setup() {
      return { args };
    },
    template: `
      <search-input v-bind="args">
        <template #actions>
          <action-button icon="open_in_full" size="sm" />
          <action-button icon="close" size="md" />
        </template>
      </search-input>
    `,
  }),
};
