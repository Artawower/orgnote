import { mount } from '@vue/test-utils';
import { test, expect, vi, beforeEach } from 'vitest';
import type { CommandIcon } from 'orgnote-api';
import NotificationsList from './NotificationsList.vue';
import { NOTIFICATION_GROUP } from 'src/constants/notifications';

const mockClose = vi.fn();

let mockNotifications: Array<Record<string, unknown>> = [];

const resetMockNotifications = () => {
  mockNotifications = [
    { id: 1, group: NOTIFICATION_GROUP, title: 'Test notification', type: 'info' },
  ];
};

vi.mock('notiwind', () => ({
  NotificationGroup: {
    name: 'NotificationGroup',
    template: '<div class="mock-notification-group"><slot /></div>',
    props: ['group'],
  },
  Notification: {
    name: 'Notification',
    template:
      '<div class="mock-notification"><slot :notifications="getNotifications()" :close="close" :hovering="hovering" /></div>',
    props: ['maxNotifications', 'enter', 'enterFrom', 'enterTo', 'leave', 'leaveFrom', 'leaveTo'],
    methods: {
      getNotifications() {
        return mockNotifications;
      },
      close(id: number) {
        mockClose(id);
      },
      hovering() {},
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  resetMockNotifications();
});

interface MockNotification {
  type?: string;
  icon?: CommandIcon;
  iconEnabled?: boolean;
  title?: string;
  text?: string;
  count?: number;
}

const defaultProps = {
  getNotificationType: (n: MockNotification) => n.type,
  getNotificationIcon: (n: MockNotification) => n.icon,
  getNotificationIconEnabled: (n: MockNotification) => n.iconEnabled,
  getNotificationTitle: (n: MockNotification) => n.title ?? '',
  getNotificationText: (n: MockNotification) => n.text,
  getNotificationCount: (n: MockNotification) => n.count,
};

const mountComponent = (props = {}) => {
  return mount(NotificationsList, {
    props: { ...defaultProps, ...props },
    global: {
      directives: {
        'html-safe': {
          mounted(el: HTMLElement, binding: { value: string }) {
            el.textContent = binding.value ?? '';
          },
          updated(el: HTMLElement, binding: { value: string }) {
            el.textContent = binding.value ?? '';
          },
        },
      },
      stubs: {
        AppFlex: {
          template: '<div class="app-flex"><slot /></div>',
          props: ['column', 'gap', 'alignCenter', 'start', 'alignStart'],
        },
        AppIcon: {
          template: '<span class="app-icon" />',
          props: ['name', 'color', 'size'],
        },
        AppBadge: {
          template: '<span class="app-badge" :class="$attrs.class"><slot>{{ label }}</slot></span>',
          props: ['label', 'size', 'rounded'],
        },
        ActionButton: {
          template: '<button class="action-button" @click.stop="$emit(\'click\', $event)"><slot /></button>',
          props: ['icon', 'size'],
          emits: ['click'],
        },
      },
    },
  });
};

test('NotificationsList renders notification group with correct group name', () => {
  const wrapper = mountComponent();
  const notificationGroup = wrapper.findComponent({ name: 'NotificationGroup' });

  expect(notificationGroup.exists()).toBe(true);
  expect(notificationGroup.props('group')).toBe(NOTIFICATION_GROUP);
});

test('NotificationsList renders notification with title', () => {
  const wrapper = mountComponent();

  expect(wrapper.text()).toContain('Test notification');
});

test('NotificationsList applies correct type class to notification item', () => {
  const wrapper = mountComponent();
  const notificationItem = wrapper.find('.notification-item');

  expect(notificationItem.classes()).toContain('notification-info');
});

test('NotificationsList shows close button by default', () => {
  const wrapper = mountComponent();
  const closeButton = wrapper.find('.notification-close');

  expect(closeButton.exists()).toBe(true);
});

test('NotificationsList close button calls close with notification id', async () => {
  const wrapper = mountComponent();
  const closeButton = wrapper.find('.action-button');

  await closeButton.trigger('click', { stopPropagation: vi.fn() });

  expect(mockClose).toHaveBeenCalledWith(1);
});

test('NotificationsList applies clickable class when onClick provided', async () => {
  mockNotifications[0] = {
    ...mockNotifications[0],
    onClick: vi.fn(),
  };

  const wrapper = mountComponent();
  const notificationItem = wrapper.find('.notification-item');

  expect(notificationItem.classes()).toContain('clickable');
});

test('NotificationsList calls onClick when notification clicked', async () => {
  const onClickMock = vi.fn();
  mockNotifications[0] = {
    ...mockNotifications[0],
    onClick: onClickMock,
  };

  const wrapper = mountComponent();
  const notificationItem = wrapper.find('.notification-item');

  await notificationItem.trigger('click');

  expect(onClickMock).toHaveBeenCalled();
});

test('NotificationsList renders notification text when provided', () => {
  mockNotifications[0] = {
    ...mockNotifications[0],
    text: 'Additional description',
  };

  const wrapper = mountComponent();

  expect(wrapper.text()).toContain('Additional description');
});

test('NotificationsList renders badge when count > 1', () => {
  mockNotifications[0] = {
    ...mockNotifications[0],
    count: 5,
  };

  const wrapper = mountComponent();
  const badge = wrapper.find('.notification-badge');

  expect(badge.exists()).toBe(true);
  expect(badge.text()).toBe('5');
});

test('NotificationsList does not render badge when count is 1', () => {
  mockNotifications[0] = {
    id: 1,
    group: NOTIFICATION_GROUP,
    title: 'Test',
    type: 'info',
    count: 1,
  };

  const wrapper = mountComponent();
  const badge = wrapper.find('.notification-badge');

  expect(badge.exists()).toBe(false);
});

test('NotificationsList uses provided count resolver', () => {
  const wrapper = mountComponent({
    getNotificationCount: () => 4,
  });
  const badge = wrapper.find('.notification-badge');

  expect(badge.exists()).toBe(true);
  expect(badge.text()).toBe('4');
});

test('NotificationsList hides close button when closable is false', () => {
  mockNotifications[0] = {
    id: 1,
    group: NOTIFICATION_GROUP,
    title: 'Test',
    type: 'info',
    closable: false,
  };

  const wrapper = mountComponent();
  const closeButton = wrapper.find('.notification-close');

  expect(closeButton.exists()).toBe(false);
});

test('NotificationsList renders icon when custom icon provided', () => {
  mockNotifications[0] = {
    id: 1,
    group: NOTIFICATION_GROUP,
    title: 'Test',
    type: 'info',
    icon: 'custom_icon',
  };

  const wrapper = mountComponent();
  const icon = wrapper.find('.app-icon');

  expect(icon.exists()).toBe(true);
});

test('NotificationsList renders default icon when iconEnabled is true', () => {
  mockNotifications[0] = {
    id: 1,
    group: NOTIFICATION_GROUP,
    title: 'Test',
    type: 'danger',
    iconEnabled: true,
  };

  const wrapper = mountComponent();
  const icon = wrapper.find('.app-icon');

  expect(icon.exists()).toBe(true);
});

test('NotificationsList does not render icon when iconEnabled is false and no custom icon', () => {
  mockNotifications[0] = {
    id: 1,
    group: NOTIFICATION_GROUP,
    title: 'Test',
    type: 'info',
    iconEnabled: false,
  };

  const wrapper = mountComponent();
  const icon = wrapper.find('.app-icon');

  expect(icon.exists()).toBe(false);
});

test('NotificationsList groups notifications by groupKey', () => {
  mockNotifications.length = 0;
  mockNotifications.push(
    { id: 1, group: NOTIFICATION_GROUP, title: 'First', groupKey: 'same-key', count: 1 },
    { id: 2, group: NOTIFICATION_GROUP, title: 'Second', groupKey: 'same-key', count: 2 },
  );

  const wrapper = mountComponent();
  const items = wrapper.findAll('.notification-item');

  expect(items).toHaveLength(1);
  expect(wrapper.find('.notification-badge').text()).toBe('2');
});

test('NotificationsList keeps notifications without groupKey separate', () => {
  mockNotifications.length = 0;
  mockNotifications.push(
    { id: 1, group: NOTIFICATION_GROUP, title: 'First' },
    { id: 2, group: NOTIFICATION_GROUP, title: 'Second' },
  );

  const wrapper = mountComponent();
  const items = wrapper.findAll('.notification-item');

  expect(items).toHaveLength(2);
});

test('NotificationsList accepts maxNotifications prop', () => {
  const wrapper = mountComponent({ maxNotifications: 3 });
  const notification = wrapper.findComponent({ name: 'Notification' });

  expect(notification.props('maxNotifications')).toBe(3);
});

test('NotificationsList uses default maxNotifications of 5', () => {
  const wrapper = mountComponent();
  const notification = wrapper.findComponent({ name: 'Notification' });

  expect(notification.props('maxNotifications')).toBe(5);
});
