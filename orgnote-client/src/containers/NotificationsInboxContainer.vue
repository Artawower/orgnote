<template>
  <safe-area fit>
    <container-layout gap="md" class="notifications-inbox">
      <app-flex column v-if="notifications.length > 0" gap="sm" class="notifications-list">
        <app-notification
          v-for="(notification, index) in notifications"
          :key="`${notification.config.id}-${notification.createdAt}-${index}`"
          :icon="notification.config.icon ?? notification.icon"
          :icon-enabled="notification.config.iconEnabled ?? notification.iconEnabled"
          :type="notification.config.level ?? 'info'"
          :message="notification.config.message"
          :caption="notification.config.description"
          :count="notification.count"
          :unread="!notification.readAt"
          :closable="notification.config.closable !== false"
          :clickable="hasNotificationAction(notification)"
          flat
          @click="handleNotificationClick(notification.config.id)"
          @close="handleDelete(notification.config.id)"
        />
      </app-flex>

      <empty-state v-else :title="t(I18N.NO_NOTIFICATIONS)" icon="sym_o_notifications" />

      <template v-if="notifications.length" #footer>
        <menu-group>
          <menu-item type="warning" @click="clearAll">
            {{ t(I18N.CLEAR_ALL_NOTIFICATIONS) }}
          </menu-item>
        </menu-group>
      </template>
    </container-layout>
  </safe-area>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { I18N, type Notification } from 'orgnote-api';
import { api } from 'src/boot/api';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import SafeArea from 'src/components/SafeArea.vue';
import EmptyState from 'src/components/EmptyState.vue';
import AppNotification from 'src/components/AppNotification.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { useI18n } from 'vue-i18n';

const notificationsStore = api.core.useNotifications();
const { notifications } = storeToRefs(notificationsStore);

const handleDelete = (id?: string): void => {
  if (!id) return;
  notificationsStore.delete(id);
};

const markAsRead = (id?: string): void => {
  if (!id) return;
  notificationsStore.markAsRead(id);
};

const hasNotificationAction = (notification: Notification): boolean =>
  Boolean(notification.config.onClick || notification.config.actionCommand);

const executeNotificationAction = (notification: Notification): void => {
  const onClick = notification.config.onClick;
  if (onClick) {
    onClick();
    return;
  }

  const command = notification.config.actionCommand;
  if (!command) return;
  void api.core.useCommands().execute(command, notification.config.actionPayload);
};

const handleNotificationClick = (id?: string): void => {
  if (!id) return;
  const notification = notifications.value.find((item) => item.config.id === id);
  if (!notification) return;
  if (hasNotificationAction(notification)) executeNotificationAction(notification);
  markAsRead(id);
};

const clearAll = (): void => {
  notificationsStore.clear();
};

const markAllAsRead = (): void => {
  notifications.value
    .filter((notification) => !notification.readAt)
    .forEach((notification) => markAsRead(notification.config.id));
};

onMounted(markAllAsRead);

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.notifications-inbox {
  --notification-min-width: 0;

  height: 100%;
  padding: var(--padding-md);
  box-sizing: border-box;
}

.notifications-list {
  width: 100%;
}
</style>
