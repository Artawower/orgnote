import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InlineDateToken from 'src/components/InlineDateToken.vue';

interface InlineDateTokenStoryArgs {
  editable?: boolean;
  monospace?: boolean;
  focusTone?: 'none' | 'accent' | 'current';
}

const meta = {
  component: InlineDateToken,
  title: 'App Date/Inline Date Token',
  tags: ['autodocs'],
  args: {
    editable: false,
    monospace: false,
    focusTone: 'none',
  },
  argTypes: {
    focusTone: {
      control: 'select',
      options: ['none', 'accent', 'current'],
    },
  },
} as Meta<InlineDateTokenStoryArgs>;

export default meta;

type Story = StoryObj<InlineDateTokenStoryArgs>;

export const Default: Story = {
  render: (args) => ({
    components: { InlineDateToken },
    setup() {
      return { args };
    },
    template: '<inline-date-token v-bind="args">&lt;2026-03-16 Mon&gt;</inline-date-token>',
  }),
};

export const Editable: Story = {
  args: {
    editable: true,
    focusTone: 'accent',
  },
  render: (args) => ({
    components: { InlineDateToken },
    setup() {
      const clicks = ref(0);
      const onActivate = () => {
        clicks.value += 1;
      };

      return { args, clicks, onActivate };
    },
    template: `
      <div style="display: grid; gap: 8px; justify-items: start;">
        <inline-date-token v-bind="args" @activate="onActivate">
          &lt;2026-03-16 Mon 10:00&gt;
        </inline-date-token>
        <small style="color: var(--fg-muted);">Activate events: {{ clicks }}</small>
      </div>
    `,
  }),
};

export const MonospaceCurrentFocus: Story = {
  args: {
    editable: true,
    monospace: true,
    focusTone: 'current',
  },
  render: (args) => ({
    components: { InlineDateToken },
    setup() {
      return { args };
    },
    template: `
      <div style="color: var(--yellow); font-weight: 500;">
        <inline-date-token v-bind="args">&lt;2026-03-16 Mon 10:00-11:00 +1w&gt;</inline-date-token>
      </div>
    `,
  }),
};

export const OrgTimestampSemantics: Story = {
  args: {
    editable: true,
    monospace: true,
    focusTone: 'current',
  },
  render: (args) => ({
    components: { InlineDateToken },
    setup() {
      return { args };
    },
    template: `
      <div style="display: grid; gap: 12px; justify-items: start;">
        <div style="display: grid; gap: 4px;">
          <small style="color: var(--fg-muted);">Active timestamp (&lt;date&gt;)</small>
          <div style="color: var(--yellow); font-weight: 500;">
            <inline-date-token v-bind="args">&lt;2026-03-16 Mon 10:00-11:00 +1w&gt;</inline-date-token>
          </div>
        </div>
        <div style="display: grid; gap: 4px;">
          <small style="color: var(--fg-muted);">Inactive timestamp ([date])</small>
          <div style="color: var(--fg-muted); font-weight: 500;">
            <inline-date-token v-bind="args">[2026-03-16 Mon 10:00]</inline-date-token>
          </div>
        </div>
        <div style="display: grid; gap: 4px;">
          <small style="color: var(--fg-muted);">Expired active timestamp</small>
          <div style="color: var(--red); font-weight: 500;">
            <inline-date-token v-bind="args">&lt;2020-01-01 Wed 09:00&gt;</inline-date-token>
          </div>
        </div>
      </div>
    `,
  }),
};
