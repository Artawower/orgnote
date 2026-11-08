import type { StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import AppSidebar from 'src/components/AppSidebar.vue';
import AppFlex from 'src/components/AppFlex.vue';
import ActionButton from 'src/components/ActionButton.vue';

export default {
  component: AppSidebar,
  title: 'Layout/AppSidebar',
  tags: ['autodocs'],
  argTypes: {
    side: {
      control: 'select',
      options: ['left', 'right'],
    },
  },
  decorators: [
    () => ({
      template: '<div style="height: 500px; display: flex;"><story /></div>',
    }),
  ],
};

export const LeftSidebar: StoryObj = {
  args: {
    side: 'left',
    opened: true,
  },
  render: (args) => ({
    components: { AppSidebar, AppFlex },
    setup: () => ({ args }),
    template: `
      <app-sidebar v-bind="args">
        <app-flex column gap="sm" style="padding: 8px 0;">
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px;">File Manager</div>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px;">Recent Notes</div>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px;">Bookmarks</div>
        </app-flex>
      </app-sidebar>
    `,
  }),
};

export const RightSidebar: StoryObj = {
  args: {
    side: 'right',
    opened: true,
  },
  render: (args) => ({
    components: { AppSidebar, AppFlex, ActionButton },
    setup: () => ({ args }),
    template: `
      <div style="flex: 1; background: var(--bg-main); display: flex; align-items: center; justify-content: center;">
        <span>Main Content</span>
      </div>
      <app-sidebar v-bind="args">
        <template #header>
          <app-flex end align-center gap="sm">
            <action-button icon="push_pin" size="sm" />
            <action-button icon="close" size="sm" />
          </app-flex>
        </template>
        <div style="padding: 8px 0;">
          <h4 style="margin: 0 0 8px;">Table of Contents</h4>
          <div style="padding: 4px 0; opacity: 0.8;">1. Introduction</div>
          <div style="padding: 4px 0 4px 16px; opacity: 0.6;">1.1 Overview</div>
          <div style="padding: 4px 0 4px 16px; opacity: 0.6;">1.2 Getting Started</div>
          <div style="padding: 4px 0; opacity: 0.8;">2. Features</div>
          <div style="padding: 4px 0; opacity: 0.8;">3. Conclusion</div>
        </div>
      </app-sidebar>
    `,
  }),
};

export const WithMiniSection: StoryObj = {
  args: {
    side: 'left',
    opened: true,
    mini: true,
  },
  render: (args) => ({
    components: { AppSidebar, AppFlex, ActionButton },
    setup: () => ({ args }),
    template: `
      <app-sidebar v-bind="args">
        <template #mini-top>
          <app-flex column gap="sm">
            <action-button icon="folder" />
            <action-button icon="search" />
            <action-button icon="bookmark" />
          </app-flex>
        </template>
        <template #mini-footer>
          <app-flex column gap="sm">
            <action-button icon="settings" />
          </app-flex>
        </template>
        <div style="padding: 8px 0;">
          <h4 style="margin: 0 0 8px;">Files</h4>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 4px;">notes/</div>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 4px;">projects/</div>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px;">archive/</div>
        </div>
      </app-sidebar>
    `,
  }),
};

export const WithHeaderAndFooter: StoryObj = {
  args: {
    side: 'left',
    opened: true,
  },
  render: (args) => ({
    components: { AppSidebar, AppFlex, ActionButton },
    setup: () => ({ args }),
    template: `
      <app-sidebar v-bind="args">
        <template #header>
          <app-flex between align-center>
            <span style="font-weight: 500;">Navigation</span>
            <action-button icon="add" size="sm" />
          </app-flex>
        </template>
        <div style="flex: 1; padding: 8px 0;">
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 4px;">Dashboard</div>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 4px;">Notes</div>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px;">Settings</div>
        </div>
        <template #footer>
          <app-flex align-center gap="sm" style="padding: 8px;">
            <action-button icon="account_circle" size="sm" />
            <span style="font-size: 14px;">User Name</span>
          </app-flex>
        </template>
      </app-sidebar>
    `,
  }),
};

export const Resizable: StoryObj = {
  args: {
    side: 'right',
    opened: true,
    resizable: true,
    minWidth: 200,
    maxWidth: 500,
  },
  render: (args) => ({
    components: { AppSidebar, AppFlex, ActionButton },
    setup() {
      const width = ref(300);
      return { args, width };
    },
    template: `
      <div style="flex: 1; background: var(--bg-main); display: flex; align-items: center; justify-content: center;">
        <span>Main Content Area</span>
      </div>
      <app-sidebar v-bind="args" v-model:width="width">
        <template #header>
          <app-flex between align-center>
            <span style="font-size: 12px; opacity: 0.6;">Width: {{ width }}px</span>
            <action-button icon="close" size="sm" />
          </app-flex>
        </template>
        <div style="padding: 8px 0;">
          <p style="margin: 0 0 8px; font-size: 14px;">Drag the left edge to resize this sidebar.</p>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px;">Resizable Content</div>
        </div>
      </app-sidebar>
    `,
  }),
};

export const ClosedState: StoryObj = {
  args: {
    side: 'left',
    opened: false,
    mini: true,
  },
  render: (args) => ({
    components: { AppSidebar, AppFlex, ActionButton },
    setup() {
      const opened = ref(false);
      return { args, opened };
    },
    template: `
      <app-sidebar v-bind="args" :opened="opened">
        <template #mini-top>
          <app-flex column gap="sm">
            <action-button icon="menu" @click="opened = !opened" />
            <action-button icon="folder" />
            <action-button icon="search" />
          </app-flex>
        </template>
        <template #mini-footer>
          <action-button icon="settings" />
        </template>
        <div style="padding: 8px 0;">
          <p>Click menu icon to toggle</p>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px;">Content</div>
        </div>
      </app-sidebar>
    `,
  }),
};

export const FullExample: StoryObj = {
  render: () => ({
    components: { AppSidebar, AppFlex, ActionButton },
    setup() {
      const leftOpened = ref(true);
      const rightOpened = ref(true);
      const leftWidth = ref(320);
      const rightWidth = ref(280);
      return { leftOpened, rightOpened, leftWidth, rightWidth };
    },
    template: `
      <app-sidebar side="left" :opened="leftOpened" mini resizable v-model:width="leftWidth" :min-width="250" :max-width="500">
        <template #mini-top>
          <app-flex column gap="sm">
            <action-button icon="menu" @click="leftOpened = !leftOpened" />
            <action-button icon="folder" />
            <action-button icon="search" />
          </app-flex>
        </template>
        <template #mini-footer>
          <action-button icon="settings" />
        </template>
        <template #header>
          <app-flex between align-center>
            <span style="font-weight: 500;">Files</span>
            <span style="font-size: 12px; opacity: 0.6;">{{ leftWidth }}px</span>
          </app-flex>
        </template>
        <div style="flex: 1; padding: 8px 0;">
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 4px;">notes/</div>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 4px;">projects/</div>
          <div style="padding: 8px; background: var(--bg-hover); border-radius: 4px;">archive/</div>
        </div>
      </app-sidebar>

      <div style="flex: 1; background: var(--bg-main); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;">
        <span>Main Content</span>
        <app-flex gap="sm">
          <button @click="leftOpened = !leftOpened">Toggle Left</button>
          <button @click="rightOpened = !rightOpened">Toggle Right</button>
        </app-flex>
      </div>

      <app-sidebar v-if="rightOpened" side="right" resizable v-model:width="rightWidth" :min-width="200" :max-width="400">
        <template #header>
          <app-flex end align-center gap="sm">
            <span style="font-size: 12px; opacity: 0.6;">{{ rightWidth }}px</span>
            <action-button icon="close" size="sm" @click="rightOpened = false" />
          </app-flex>
        </template>
        <div style="padding: 8px 0;">
          <h4 style="margin: 0 0 8px;">Outline</h4>
          <div style="padding: 4px 0; opacity: 0.8;">Section 1</div>
          <div style="padding: 4px 0 4px 16px; opacity: 0.6;">Subsection 1.1</div>
          <div style="padding: 4px 0; opacity: 0.8;">Section 2</div>
        </div>
      </app-sidebar>
    `,
  }),
};
