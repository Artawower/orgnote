import type { Notify } from 'quasar';
import { NotificationConfig } from './notification-config';
import { StoreDefinition } from './store';
import { Ref } from 'vue';

export interface Notification {
  readAt?: string;
  createdAt: string;
  count?: number;
  config: NotificationConfig;
  dismiss?: ReturnType<typeof Notify.create>;
  icon?: string;
  iconEnabled?: boolean;
}

export interface NotificationsStore {
  notify: (config: NotificationConfig) => string;
  update: (notificationId: string, updates: Partial<NotificationConfig>) => void;
  clear: () => void;
  hideAll: () => void;
  delete: (notificationId: string) => void;
  markAsRead: (notificationId: string, readAt?: string) => void;

  notifications: Ref<Notification[]>;
}

export type NotificationsStoreDefinition = StoreDefinition<NotificationsStore>;
