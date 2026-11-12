import { defineBoot } from '@quasar/app-vite/wrappers';
import { Platform } from 'quasar';

export default defineBoot(({ router }) => {
  if (!Platform.is.electron || !window.electron) {
    return;
  }

  window.electron.onNavigate((route: string) => {
    // TODO: dev Add safety checks for route
    router.push(route);
  });
});
