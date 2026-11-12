<template>
  <notifications-list
    :max-notifications="maxNotifications"
    :get-notification-type="getNotificationType"
    :get-notification-icon="getNotificationIcon"
    :get-notification-icon-enabled="getNotificationIconEnabled"
    :get-notification-title="getNotificationTitle"
    :get-notification-text="getNotificationText"
    :get-notification-count="getNotificationCount"
  />
</template>

<script setup lang="ts">
import type { CommandIcon, Notification, NotificationConfig } from 'orgnote-api';
import { api } from 'src/boot/api';
import NotificationsList from 'src/components/NotificationsList.vue';

withDefaults(
  defineProps<{
    maxNotifications?: number;
  }>(),
  {
    maxNotifications: 5,
  },
);

const notificationsStore = api.core.useNotifications();

interface NotiwindNotification {
  id: number;
  group: string;
  title?: string;
  text?: string;
  type?: string;
  count?: number;
  groupKey?: string;
  closable?: boolean;
  icon?: CommandIcon;
  iconEnabled?: boolean;
  onClick?: () => void;
  [key: string]: unknown;
}

const getStoreNotification = (groupKey: string | undefined): Notification | undefined => {
  if (!groupKey) return undefined;
  return notificationsStore.notifications.find((notification) => notification.config.id === groupKey);
};

const getStoreConfig = (groupKey: string | undefined): NotificationConfig | undefined =>
  getStoreNotification(groupKey)?.config;

const getNotificationType = (notification: NotiwindNotification): string | undefined =>
  getStoreConfig(notification.groupKey)?.level ?? notification.type;

const getNotificationIcon = (notification: NotiwindNotification): CommandIcon | undefined =>
  getStoreConfig(notification.groupKey)?.icon ?? notification.icon;

const getNotificationIconEnabled = (notification: NotiwindNotification): boolean | undefined =>
  getStoreConfig(notification.groupKey)?.iconEnabled ?? notification.iconEnabled;

const getNotificationTitle = (notification: NotiwindNotification): string =>
  getStoreConfig(notification.groupKey)?.message ?? notification.title ?? '';

const getNotificationText = (notification: NotiwindNotification): string | undefined =>
  getStoreConfig(notification.groupKey)?.description ?? notification.text;

const getNotificationCount = (notification: NotiwindNotification): number | undefined =>
  getStoreNotification(notification.groupKey)?.count ?? notification.count;
</script>
