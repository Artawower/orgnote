import { Platform } from 'quasar';

export function useBodyClasses(): void {
  if (process.env.CLIENT && window.navigator.standalone) {
    document.body.classList.add('standalone');
  }
  if (Platform.is?.mac) {
    document.body.classList.add('platform-mac');
  }
}
