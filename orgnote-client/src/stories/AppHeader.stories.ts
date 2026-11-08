import type { StoryObj } from '@storybook/vue3-vite';
import AppHeader from 'src/components/AppHeader.vue';
import ActionButton from 'src/components/ActionButton.vue';

export default {
  component: AppHeader,
  title: 'Layout/AppHeader',
  tags: ['autodocs'],
};

export const Default: StoryObj = {
  args: {
    title: 'Page Title',
  },
};

export const WithActions: StoryObj = {
  args: {
    title: 'Notes',
  },
  render: (args) => ({
    components: { AppHeader, ActionButton },
    setup: () => ({ args }),
    template: `
      <app-header v-bind="args">
        <template #left>
          <action-button icon="arrow_back_ios" size="sm" />
        </template>
        <template #right>
          <action-button icon="search" size="sm" />
          <action-button icon="more_vert" size="sm" />
        </template>
      </app-header>
    `,
  }),
};

export const Float: StoryObj = {
  args: {
    title: 'Floating Header',
    float: true,
  },
  render: (args) => ({
    components: { AppHeader, ActionButton },
    setup: () => ({ args }),
    template: `
      <div style="background: var(--bg-main); padding: 0;">
        <app-header v-bind="args">
          <template #left>
            <action-button icon="menu" size="sm" />
          </template>
          <template #right>
            <action-button icon="settings" size="sm" />
          </template>
        </app-header>
      </div>
    `,
  }),
};

export const CustomCenter: StoryObj = {
  render: () => ({
    components: { AppHeader, ActionButton },
    template: `
      <app-header>
        <template #left>
          <action-button icon="close" size="sm" />
        </template>
        <template #center>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-weight: 500;">Custom</span>
            <span style="opacity: 0.6;">Center Content</span>
          </div>
        </template>
        <template #right>
          <action-button icon="check" size="sm" />
        </template>
      </app-header>
    `,
  }),
};

export const OnlyTitle: StoryObj = {
  args: {
    title: 'Simple Title Only',
  },
};
