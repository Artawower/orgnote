import { mount } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import type { Notification } from 'orgnote-api';
import NotificationsInboxContainer from './NotificationsInboxContainer.vue';

const mockExecute = vi.fn();
const mockDelete = vi.fn();
const mockClear = vi.fn();
const mockMarkAsRead = vi.fn();
const mockNotifications = ref<Notification[]>([]);

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useCommands: () => ({ execute: mockExecute }),
      useNotifications: () => ({
        notifications: mockNotifications,
        delete: mockDelete,
        clear: mockClear,
        markAsRead: mockMarkAsRead,
      }),
    },
  },
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const AppNotificationStub = defineComponent({
  name: 'AppNotification',
  props: {
    flat: Boolean,
  },
  emits: ['click', 'close'],
  setup(_, { emit }) {
    return () =>
      h('button', { class: 'notification', onClick: () => emit('click') }, [
        h('span', 'notification'),
        h('button', {
          class: 'close',
          onClick: (event: Event) => {
            event.stopPropagation();
            emit('close');
          },
        }),
      ]);
  },
});

const mountContainer = () =>
  mount(NotificationsInboxContainer, {
    global: {
      stubs: {
        SafeArea: { template: '<div><slot /></div>' },
        ContainerLayout: { template: '<div><slot /><slot name="footer" /></div>' },
        AppFlex: { template: '<div><slot /></div>' },
        EmptyState: { template: '<div />' },
        CardWrapper: { template: '<div><slot /></div>' },
        MenuItem: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        AppNotification: AppNotificationStub,
      },
    },
  });

const createNotification = (config: Notification['config']): Notification => ({
  createdAt: new Date().toISOString(),
  readAt: undefined,
  count: 1,
  config,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockNotifications.value = [];
});

test('sidebar notifications use flat appearance', () => {
  mockNotifications.value = [createNotification({ id: 'n1', message: 'Update available' })];
  const wrapper = mountContainer();

  expect(wrapper.findComponent(AppNotificationStub).props('flat')).toBe(true);
});

test('notification click invokes stored onClick action', async () => {
  const onClick = vi.fn();
  mockNotifications.value = [createNotification({ id: 'n1', message: 'Open logs', onClick })];
  const wrapper = mountContainer();

  await wrapper.find('.notification').trigger('click');

  expect(onClick).toHaveBeenCalledOnce();
  expect(mockExecute).not.toHaveBeenCalled();
  expect(mockMarkAsRead).toHaveBeenCalledWith('n1');
});

test('notification click executes action command when no onClick exists', async () => {
  mockNotifications.value = [
    createNotification({ id: 'n2', message: 'Open update', actionCommand: 'show update', actionPayload: { id: 1 } }),
  ];
  const wrapper = mountContainer();

  await wrapper.find('.notification').trigger('click');

  expect(mockExecute).toHaveBeenCalledWith('show update', { id: 1 });
  expect(mockMarkAsRead).toHaveBeenCalledWith('n2');
});
