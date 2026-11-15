import { setActivePinia, createPinia } from 'pinia';
import { useNotificationsStore } from './notifications';
import { notify as notiwindNotify } from 'notiwind';
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { NOTIFICATION_GROUP } from 'src/constants/notifications';

const DEFAULT_TIMEOUT = 3000;

vi.mock('notiwind', () => ({
  notify: vi.fn(() => vi.fn()),
}));

vi.mock('./config', async () => {
  const { ref } = await import('vue');
  return {
    useConfigStore: vi.fn(() => ({
      config: ref({ ui: { notificationTimeout: DEFAULT_TIMEOUT, notificationThrottleMs: 300000 } }),
    })),
  };
});

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

test('NotificationsStore notify calls notiwind with correct params', () => {
  const store = useNotificationsStore();

  store.notify({
    message: 'Test message',
    level: 'info',
    stored: true,
  });

  expect(notiwindNotify).toHaveBeenCalledWith(
    expect.objectContaining({
      group: NOTIFICATION_GROUP,
      title: 'Test message',
      type: 'info',
    }),
    DEFAULT_TIMEOUT,
  );
  expect(store.notifications).toHaveLength(1);
  expect(store.notifications[0]?.config.message).toBe('Test message');
  expect(store.notifications[0]?.readAt).toBeUndefined();
  expect(store.notifications[0]?.createdAt).toBeDefined();
});

test('NotificationsStore notify uses custom timeout', () => {
  const store = useNotificationsStore();

  store.notify({
    message: 'Test',
    timeout: 5000,
  });

  expect(notiwindNotify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test' }), 5000);
});

test('NotificationsStore notify passes description as text', () => {
  const store = useNotificationsStore();

  store.notify({
    message: 'Title',
    description: 'Description text',
  });

  expect(notiwindNotify).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Title',
      text: 'Description text',
    }),
    DEFAULT_TIMEOUT,
  );
});

test('NotificationsStore notify generates id when not provided', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', stored: true });

  expect(store.notifications[0]?.config.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test('NotificationsStore notify uses provided id', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'custom-id', stored: true });

  expect(store.notifications[0]?.config.id).toBe('custom-id');
});

test('NotificationsStore notify throttles grouped toasts by id', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  const store = useNotificationsStore();

  store.notify({ message: 'First', id: 'same-id', stored: true });
  store.notify({ message: 'Second', id: 'same-id', stored: true });

  expect(notiwindNotify).toHaveBeenCalledTimes(1);
  expect(store.notifications[0]?.count).toBe(2);
  expect(store.notifications[0]?.config.message).toBe('Second');

  vi.setSystemTime(new Date('2024-01-01T00:05:01Z'));
  store.notify({ message: 'Third', id: 'same-id', stored: true });

  expect(notiwindNotify).toHaveBeenCalledTimes(2);
  expect(notiwindNotify).toHaveBeenLastCalledWith(
    expect.objectContaining({ count: 3 }),
    DEFAULT_TIMEOUT,
  );
  expect(store.notifications[0]?.count).toBe(3);
  expect(store.notifications[0]?.config.message).toBe('Third');
});

test('NotificationsStore notify moves updated stored notification to front', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'First', id: 'id-1', stored: true });
  store.notify({ message: 'Second', id: 'id-2', stored: true });
  store.notify({ message: 'First updated', id: 'id-1', stored: true });

  expect(store.notifications.map((n) => n.config.id)).toEqual(['id-1', 'id-2']);
  expect(store.notifications[0]?.config.message).toBe('First updated');
  expect(store.notifications[0]?.count).toBe(2);
});

test('NotificationsStore notify does not throttle ungrouped notifications', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'First', id: 'same-id', group: false });
  store.notify({ message: 'Second', id: 'same-id', group: false });

  expect(notiwindNotify).toHaveBeenCalledTimes(2);
});

test('NotificationsStore notify does not group generated ids', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'First' });
  store.notify({ message: 'Second' });

  expect(notiwindNotify).toHaveBeenCalledTimes(2);
});

test('NotificationsStore clear removes all notifications', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Message 1', stored: true });
  store.notify({ message: 'Message 2', stored: true });

  expect(store.notifications).toHaveLength(2);

  store.clear();

  expect(store.notifications).toHaveLength(0);
});

test('NotificationsStore delete removes specific notification by id', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Message 1', id: 'id-1', stored: true });
  store.notify({ message: 'Message 2', id: 'id-2', stored: true });

  expect(store.notifications).toHaveLength(2);

  store.delete('id-1');

  expect(store.notifications).toHaveLength(1);
  expect(store.notifications[0]?.config.id).toBe('id-2');
});

test('NotificationsStore delete removes all grouped occurrences', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'First', id: 'grouped-id', stored: true });
  store.notify({ message: 'Second', id: 'grouped-id', stored: true });

  expect(store.notifications[0]?.count).toBe(2);

  store.delete('grouped-id');

  expect(store.notifications).toHaveLength(0);

  store.notify({ message: 'Third', id: 'grouped-id', stored: true });

  expect(notiwindNotify).toHaveBeenCalledTimes(2);
  expect(store.notifications[0]?.count).toBe(1);
});

test('NotificationsStore delete does nothing when id not found', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', stored: true });

  store.delete('non-existent-id');

  expect(store.notifications).toHaveLength(1);
});

test('NotificationsStore markAsRead marks notification as read', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', stored: true });

  expect(store.notifications[0]?.readAt).toBeUndefined();

  store.markAsRead('test-id');

  expect(store.notifications[0]?.readAt).toBeDefined();
});

test('NotificationsStore markAsRead does nothing when id not found', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', stored: true });

  store.markAsRead('non-existent-id');

  expect(store.notifications[0]?.readAt).toBeUndefined();
});

test('NotificationsStore supports different notification levels', () => {
  const store = useNotificationsStore();
  const levels = ['info', 'warning', 'danger'] as const;

  levels.forEach((level) => {
    vi.clearAllMocks();
    store.notify({ message: `${level} message`, level });

    expect(notiwindNotify).toHaveBeenCalledWith(
      expect.objectContaining({ type: level }),
      DEFAULT_TIMEOUT,
    );
  });
});

test('NotificationsStore notify stores dismiss function', () => {
  const mockDismiss = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss);

  const store = useNotificationsStore();

  store.notify({ message: 'Test', stored: true });

  expect(store.notifications[0]?.dismiss).toBe(mockDismiss);
});

test('NotificationsStore clear calls dismiss for all notifications', () => {
  const mockDismiss1 = vi.fn();
  const mockDismiss2 = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss1).mockReturnValueOnce(mockDismiss2);

  const store = useNotificationsStore();

  store.notify({ message: 'Message 1', stored: true });
  store.notify({ message: 'Message 2', stored: true });

  expect(store.notifications).toHaveLength(2);

  store.clear();

  expect(mockDismiss1).toHaveBeenCalled();
  expect(mockDismiss2).toHaveBeenCalled();
  expect(store.notifications).toHaveLength(0);
});

test('NotificationsStore delete calls dismiss when deleting notification by id', () => {
  const mockDismiss = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss);

  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', stored: true });

  expect(store.notifications).toHaveLength(1);

  store.delete('test-id');

  expect(mockDismiss).toHaveBeenCalled();
  expect(store.notifications).toHaveLength(0);
});

test('NotificationsStore delete does not call dismiss when notification id not found', () => {
  const mockDismiss = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss);

  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', stored: true });

  store.delete('non-existent-id');

  expect(mockDismiss).not.toHaveBeenCalled();
  expect(store.notifications).toHaveLength(1);
});

test('NotificationsStore delete calls dismiss for correct notification when multiple exist', () => {
  const mockDismiss1 = vi.fn();
  const mockDismiss2 = vi.fn();
  const mockDismiss3 = vi.fn();
  vi.mocked(notiwindNotify)
    .mockReturnValueOnce(mockDismiss1)
    .mockReturnValueOnce(mockDismiss2)
    .mockReturnValueOnce(mockDismiss3);

  const store = useNotificationsStore();

  store.notify({ message: 'Message 1', id: 'id-1', stored: true });
  store.notify({ message: 'Message 2', id: 'id-2', stored: true });
  store.notify({ message: 'Message 3', id: 'id-3', stored: true });

  store.delete('id-2');

  expect(mockDismiss1).not.toHaveBeenCalled();
  expect(mockDismiss2).toHaveBeenCalled();
  expect(mockDismiss3).not.toHaveBeenCalled();
  expect(store.notifications).toHaveLength(2);
  expect(store.notifications.map((n) => n.config.id)).toEqual(['id-3', 'id-1']);
});

test('NotificationsStore hideAll calls dismiss and clears dismiss function', () => {
  const mockDismiss1 = vi.fn();
  const mockDismiss2 = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss1).mockReturnValueOnce(mockDismiss2);

  const store = useNotificationsStore();

  store.notify({ message: 'Message 1', stored: true });
  store.notify({ message: 'Message 2', stored: true });

  store.hideAll();

  expect(mockDismiss1).toHaveBeenCalled();
  expect(mockDismiss2).toHaveBeenCalled();
  expect(store.notifications[0]?.dismiss).toBeUndefined();
  expect(store.notifications[1]?.dismiss).toBeUndefined();
});

test('NotificationsStore notify returns notification id', () => {
  const store = useNotificationsStore();

  const id = store.notify({ message: 'Test', id: 'custom-id' });

  expect(id).toBe('custom-id');
});

test('NotificationsStore notify returns generated id when not provided', () => {
  const store = useNotificationsStore();

  const id = store.notify({ message: 'Test' });

  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test('NotificationsStore update changes notification config', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', description: 'Original description', stored: true });

  store.update('test-id', { description: 'Updated description' });

  expect(store.notifications[0]?.config.description).toBe('Updated description');
});

test('NotificationsStore update preserves unchanged fields', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', level: 'info', icon: 'info', stored: true });

  store.update('test-id', { description: 'New description' });

  expect(store.notifications[0]?.config.message).toBe('Test');
  expect(store.notifications[0]?.config.level).toBe('info');
  expect(store.notifications[0]?.config.icon).toBe('info');
  expect(store.notifications[0]?.config.description).toBe('New description');
});

test('NotificationsStore update ignores message field', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Original', id: 'test-id', stored: true });

  store.update('test-id', { message: 'Should be ignored', description: 'Updated' });

  expect(store.notifications[0]?.config.message).toBe('Original');
  expect(store.notifications[0]?.config.description).toBe('Updated');
});

test('NotificationsStore update does nothing for non-existent id', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', stored: true });

  store.update('non-existent', { description: 'Updated' });

  expect(store.notifications[0]?.config.description).toBeUndefined();
});

test('NotificationsStore update allows changing level', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', level: 'info', stored: true });

  store.update('test-id', { level: 'danger' });

  expect(store.notifications[0]?.config.level).toBe('danger');
});

test('NotificationsStore update allows changing icon', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', icon: 'info', stored: true });

  store.update('test-id', { icon: 'success' });

  expect(store.notifications[0]?.config.icon).toBe('success');
});

test('NotificationsStore update allows changing timeout', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', timeout: 3000, stored: true });

  store.update('test-id', { timeout: 10000 });

  expect(store.notifications[0]?.config.timeout).toBe(10000);
});

test('NotificationsStore update allows changing onClick handler', () => {
  const store = useNotificationsStore();
  const newClickHandler = vi.fn();

  store.notify({ message: 'Test', id: 'test-id', stored: true });

  store.update('test-id', { onClick: newClickHandler });

  expect(store.notifications[0]?.config.onClick).toBe(newClickHandler);
});

test('NotificationsStore update allows changing closable', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', closable: true, stored: true });

  store.update('test-id', { closable: false });

  expect(store.notifications[0]?.config.closable).toBe(false);
});

test('NotificationsStore update allows changing iconEnabled', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', iconEnabled: true, stored: true });

  store.update('test-id', { iconEnabled: false });

  expect(store.notifications[0]?.config.iconEnabled).toBe(false);
});

test('NotificationsStore update allows changing group', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', group: true, stored: true });

  store.update('test-id', { group: false });

  expect(store.notifications[0]?.config.group).toBe(false);
});

test('NotificationsStore multiple updates accumulate changes', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', level: 'info', stored: true });

  store.update('test-id', { description: 'First update' });
  store.update('test-id', { level: 'warning' });
  store.update('test-id', { icon: 'alert' });

  expect(store.notifications[0]?.config.description).toBe('First update');
  expect(store.notifications[0]?.config.level).toBe('warning');
  expect(store.notifications[0]?.config.icon).toBe('alert');
});

test('NotificationsStore update preserves notification identity in array', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id', stored: true });
  const originalNotification = store.notifications[0];

  store.update('test-id', { description: 'Updated' });

  expect(store.notifications[0]).toBe(originalNotification);
});

test('NotificationsStore update updates correct notification when multiple exist', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'First', id: 'id-1', description: 'Original 1', stored: true });
  store.notify({ message: 'Second', id: 'id-2', description: 'Original 2', stored: true });
  store.notify({ message: 'Third', id: 'id-3', description: 'Original 3', stored: true });

  store.update('id-2', { description: 'Updated 2' });

  expect(store.notifications[0]?.config.description).toBe('Original 3');
  expect(store.notifications[1]?.config.description).toBe('Updated 2');
  expect(store.notifications[2]?.config.description).toBe('Original 1');
});
