<template>
  <div class="notifications-wrapper">
    <NotificationGroup :group="NOTIFICATION_GROUP">
      <app-flex column gap="var(--notification-container-gap)" class="notifications-container">
        <Notification
          v-slot="{ notifications: notiwindNotifications, close, hovering }"
          :max-notifications="maxNotifications"
          enter="notification-enter"
          enter-from="notification-enter-from"
          enter-to="notification-enter-to"
          leave="notification-leave"
          leave-from="notification-leave-from"
          leave-to="notification-leave-to"
        >
          <app-notification
            v-for="notification in groupByKey(notiwindNotifications)"
            :key="notification.id"
            :type="getNotificationType(notification)"
            :icon="getNotificationIcon(notification)"
            :icon-enabled="getNotificationIconEnabled(notification)"
            :html-message="getNotificationTitle(notification)"
            :caption="getNotificationText(notification)"
            :count="getNotificationCount(notification)"
            :closable="notification.closable !== false"
            :clickable="!!notification.onClick"
            @click="notification.onClick?.()"
            @close="close(notification.id)"
            @mouseenter="hovering(notification.id, true)"
            @mouseleave="hovering(notification.id, false)"
          />
        </Notification>
      </app-flex>
    </NotificationGroup>
  </div>
</template>

<script setup lang="ts">
import type { CommandIcon } from 'orgnote-api';
import { NotificationGroup, Notification } from 'notiwind';

import AppFlex from './AppFlex.vue';
import AppNotification from './AppNotification.vue';
import { NOTIFICATION_GROUP } from 'src/constants/notifications';

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

withDefaults(
  defineProps<{
    maxNotifications?: number;
    getNotificationType: (notification: NotiwindNotification) => string | undefined;
    getNotificationIcon: (notification: NotiwindNotification) => CommandIcon | undefined;
    getNotificationIconEnabled: (notification: NotiwindNotification) => boolean | undefined;
    getNotificationTitle: (notification: NotiwindNotification) => string;
    getNotificationText: (notification: NotiwindNotification) => string | undefined;
    getNotificationCount: (notification: NotiwindNotification) => number | undefined;
  }>(),
  {
    maxNotifications: 5,
  },
);

const groupByKey = (notifications: NotiwindNotification[]): NotiwindNotification[] => {
  const seen = notifications.reduce((acc, n) => {
    const key = n.groupKey ?? `${n.id}`;
    const existing = acc.get(key);

    if (!existing) {
      acc.set(key, { ...n });
      return acc;
    }

    acc.set(key, { ...existing, ...n });
    return acc;
  }, new Map<string, NotiwindNotification>());

  return Array.from(seen.values());
};
</script>

<style lang="scss" scoped>
.notifications-container {
  position: fixed;
  top: calc(var(--app-top-inset) + var(--notification-container-top));
  right: var(--notification-container-right);
  bottom: var(--notification-container-bottom);
  left: var(--notification-container-left);
  z-index: var(--notification-z-index);
  max-width: var(--notification-max-width);
  pointer-events: none;
}

.notification-enter {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.notification-leave {
  transition: all 0.3s ease;
}

.notification-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
