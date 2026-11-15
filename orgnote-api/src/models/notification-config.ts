import { StyleVariant } from './style-variant';

export interface NotificationConfig<T = unknown> {
  id?: string;
  message: string;
  description?: string;
  group?: boolean;
  timeout?: number;
  throttleMs?: number;
  level?: StyleVariant;
  caption?: string;
  closable?: boolean;
  icon?: string;
  iconEnabled?: boolean;
  onClick?: () => void;
  actionCommand?: string;
  actionPayload?: T;
  stored?: boolean;
}
