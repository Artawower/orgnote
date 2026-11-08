import type { Meta, StoryObj } from '@storybook/vue3';
import AppNotifications from 'src/containers/AppNotifications.vue';
import { useNotificationsStore } from 'src/stores/notifications';

const meta: Meta<typeof AppNotifications> = {
  title: 'Components/AppNotifications',
  component: AppNotifications,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AppNotifications>;

export const Info: Story = {
  render: () => ({
    components: { AppNotifications },
    setup() {
      const store = useNotificationsStore();
      const trigger = () => {
        store.notify({
          message: 'Info notification',
          description: 'This is an info notification with description',
          level: 'info',
        });
      };
      return { trigger };
    },
    template: `
      <div>
        <button @click="trigger">Show Info</button>
        <AppNotifications />
      </div>
    `,
  }),
};

export const Warning: Story = {
  render: () => ({
    components: { AppNotifications },
    setup() {
      const store = useNotificationsStore();
      const trigger = () => {
        store.notify({
          message: 'Warning notification',
          description: 'Something needs your attention',
          level: 'warning',
        });
      };
      return { trigger };
    },
    template: `
      <div>
        <button @click="trigger">Show Warning</button>
        <AppNotifications />
      </div>
    `,
  }),
};

export const Danger: Story = {
  render: () => ({
    components: { AppNotifications },
    setup() {
      const store = useNotificationsStore();
      const trigger = () => {
        store.notify({
          message: 'Error notification',
          description: 'Something went wrong',
          level: 'danger',
        });
      };
      return { trigger };
    },
    template: `
      <div>
        <button @click="trigger">Show Danger</button>
        <AppNotifications />
      </div>
    `,
  }),
};

export const WithCustomIcon: Story = {
  render: () => ({
    components: { AppNotifications },
    setup() {
      const store = useNotificationsStore();
      const trigger = () => {
        store.notify({
          message: 'Custom icon',
          description: 'Notification with custom icon',
          icon: 'check_circle',
        });
      };
      return { trigger };
    },
    template: `
      <div>
        <button @click="trigger">Show Custom Icon</button>
        <AppNotifications />
      </div>
    `,
  }),
};

export const WithoutIcon: Story = {
  render: () => ({
    components: { AppNotifications },
    setup() {
      const store = useNotificationsStore();
      const trigger = () => {
        store.notify({
          message: 'No icon',
          description: 'Notification without icon',
          iconEnabled: false,
        });
      };
      return { trigger };
    },
    template: `
      <div>
        <button @click="trigger">Show Without Icon</button>
        <AppNotifications />
      </div>
    `,
  }),
};

export const NonClosable: Story = {
  render: () => ({
    components: { AppNotifications },
    setup() {
      const store = useNotificationsStore();
      const trigger = () => {
        store.notify({
          message: 'Cannot close',
          description: 'This notification cannot be closed manually',
          closable: false,
        });
      };
      return { trigger };
    },
    template: `
      <div>
        <button @click="trigger">Show Non-Closable</button>
        <AppNotifications />
      </div>
    `,
  }),
};

export const AllVariants: Story = {
  render: () => ({
    components: { AppNotifications },
    setup() {
      const store = useNotificationsStore();
      const triggerAll = () => {
        store.notify({ message: 'Info', description: 'Info description', level: 'info' });
        store.notify({ message: 'Warning', description: 'Warning description', level: 'warning' });
        store.notify({ message: 'Danger', description: 'Danger description', level: 'danger' });
      };
      return { triggerAll };
    },
    template: `
      <div>
        <button @click="triggerAll">Show All Variants</button>
        <AppNotifications />
      </div>
    `,
  }),
};
