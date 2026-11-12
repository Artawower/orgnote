import { register } from 'register-service-worker';
import { useNotificationsStore } from 'src/stores/notifications';
import {
  SKIP_WAITING_MESSAGE,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_NOTIFICATION_ID,
} from './constants';

if ('serviceWorker' in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const activateWaitingSW = (registration: ServiceWorkerRegistration) => {
    registration.waiting?.postMessage({ type: SKIP_WAITING_MESSAGE });
  };

  const showUpdateNotification = (registration: ServiceWorkerRegistration) => {
    const notifications = useNotificationsStore();

    notifications.notify({
      id: UPDATE_NOTIFICATION_ID,
      message: 'New version available',
      description: 'Click to update',
      level: 'info',
      timeout: 0,
      onClick: () => activateWaitingSW(registration),
    });
  };

  register(process.env.SERVICE_WORKER_FILE, {
    ready(registration) {
      if (registration.waiting) {
        activateWaitingSW(registration);
      }

      setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS);
    },
    updated(registration) {
      showUpdateNotification(registration);
    },
  });
}
