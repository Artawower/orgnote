import { defineStore, storeToRefs } from 'pinia';
import { type Notification, type NotificationConfig, type NotificationsStore } from 'orgnote-api';
import { ref } from 'vue';
import { notify as notiwindNotify } from 'notiwind';
import { useConfigStore } from './config';
import { NOTIFICATION_GROUP } from 'src/constants/notifications';
import { DEFAULT_NOTIFICATION_THROTTLE_MS } from 'src/constants/config';

export const useNotificationsStore = defineStore<'notifications', NotificationsStore>(
  'notifications',
  (): NotificationsStore => {
    const notifications = ref<Notification[]>([]);
    const lastToastAtByGroup = new Map<string, number>();

    const { config } = storeToRefs(useConfigStore());

    const resolveNotificationId = (id?: string): string => {
      if (id && id.trim()) return id;
      return crypto.randomUUID();
    };

    const resolveThrottleMs = (notificationConfig: NotificationConfig): number =>
      notificationConfig.throttleMs ??
      config.value.ui.notificationThrottleMs ??
      DEFAULT_NOTIFICATION_THROTTLE_MS;

    const hasStableNotificationId = (id?: string): boolean => Boolean(id?.trim());

    const shouldShowToast = (
      groupKey: string,
      shouldGroup: boolean,
      throttleMs: number,
    ): boolean => {
      if (!shouldGroup || throttleMs <= 0) return true;

      const now = Date.now();
      const lastShownAt = lastToastAtByGroup.get(groupKey);
      if (lastShownAt && now - lastShownAt < throttleMs) return false;

      lastToastAtByGroup.set(groupKey, now);
      return true;
    };

    const createToast = (
      notificationConfig: NotificationConfig,
      groupKey: string,
      count?: number,
    ): Notification['dismiss'] =>
      notiwindNotify(
        {
          group: NOTIFICATION_GROUP,
          title: notificationConfig.message,
          text: notificationConfig.description,
          type: notificationConfig.level ?? 'info',
          count,
          groupKey,
          closable: notificationConfig.closable ?? true,
          icon: notificationConfig.icon,
          iconEnabled: notificationConfig.iconEnabled ?? true,
          onClick: notificationConfig.onClick,
        },
        notificationConfig.timeout ?? config.value.ui.notificationTimeout ?? 5000,
      );

    const moveNotificationToFront = (notificationIndex: number): Notification | undefined => {
      const [notification] = notifications.value.splice(notificationIndex, 1);
      if (!notification) return undefined;
      notifications.value.unshift(notification);
      return notification;
    };

    const getNextStoredCount = (
      notificationConfig: NotificationConfig,
      id: string,
    ): number | undefined => {
      if (!notificationConfig.stored) return undefined;
      const existingNotification = notifications.value.find((n) => n.config.id === id);
      if (!existingNotification) return undefined;
      return (existingNotification.count ?? 1) + 1;
    };

    const updateStoredNotification = (
      notificationConfig: NotificationConfig,
      id: string,
      dismiss: Notification['dismiss'],
    ): void => {
      const existingIndex = notifications.value.findIndex((n) => n.config.id === id);
      const configWithId = { ...notificationConfig, id };

      if (existingIndex >= 0) {
        const existingNotification = moveNotificationToFront(existingIndex);
        if (!existingNotification) return;
        if (dismiss) {
          existingNotification.dismiss?.();
          existingNotification.dismiss = dismiss;
        }
        existingNotification.config = configWithId;
        existingNotification.icon = notificationConfig.icon;
        existingNotification.iconEnabled = notificationConfig.iconEnabled ?? true;
        existingNotification.createdAt = new Date().toISOString();
        existingNotification.readAt = undefined;
        existingNotification.count = (existingNotification.count ?? 1) + 1;
        return;
      }

      notifications.value.unshift({
        createdAt: new Date().toISOString(),
        readAt: undefined,
        count: 1,
        dismiss,
        config: configWithId,
        icon: notificationConfig.icon,
        iconEnabled: notificationConfig.iconEnabled ?? true,
      });
    };

    const notify = (notificationConfig: NotificationConfig): string => {
      const id = resolveNotificationId(notificationConfig.id);
      const shouldGroup =
        hasStableNotificationId(notificationConfig.id) && notificationConfig.group !== false;
      const groupKey = id;
      const throttleMs = resolveThrottleMs(notificationConfig);
      const count = shouldGroup ? getNextStoredCount(notificationConfig, id) : undefined;
      const dismiss = shouldShowToast(groupKey, shouldGroup, throttleMs)
        ? createToast(notificationConfig, groupKey, count)
        : undefined;

      if (notificationConfig.stored) {
        updateStoredNotification(notificationConfig, id, dismiss);
      }

      return id;
    };

    const clear = (): void => {
      notifications.value.forEach((n) => n.dismiss?.());
      notifications.value = [];
      lastToastAtByGroup.clear();
    };

    const deleteNotification = (notificationId: string): void => {
      if (!notificationId) return;

      const notificationIndex = notifications.value.findIndex(
        (n) => n.config.id === notificationId,
      );
      if (notificationIndex < 0) return;

      const notification = notifications.value[notificationIndex];
      if (!notification) return;

      notification.dismiss?.();
      notifications.value.splice(notificationIndex, 1);
      lastToastAtByGroup.delete(notificationId);
    };

    const markAsRead = (notificationId: string, readAt?: string): void => {
      if (!notificationId) return;
      const notification = notifications.value.find((n) => n.config.id === notificationId);
      if (!notification) return;
      notification.readAt = readAt ?? new Date().toISOString();
    };

    const hideAll = (): void => {
      notifications.value.forEach((n) => {
        n.dismiss?.();
        n.dismiss = undefined;
      });
    };

    const update = (notificationId: string, updates: Partial<NotificationConfig>): void => {
      const notification = notifications.value.find((n) => n.config.id === notificationId);
      if (!notification) return;

      const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => key !== 'message'),
      ) as Partial<NotificationConfig>;

      notification.config = { ...notification.config, ...safeUpdates };
    };

    return {
      notify,
      update,
      clear,
      hideAll,
      delete: deleteNotification,
      markAsRead,
      notifications,
    };
  },
  {
    persist: true,
  },
);
