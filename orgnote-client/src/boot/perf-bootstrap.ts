import { defineBoot } from '@quasar/app-vite/wrappers';
import {
  BOOT_SCOPE,
  bootTimer,
  recordEvent,
  recordEventAt,
  setupPerformanceObserver,
} from 'src/boot/perf-timer';

interface StartupWindow extends Window {
  __orgnoteStartup?: {
    htmlInlineScriptAt?: number;
  };
}

export default defineBoot(() => {
  setupPerformanceObserver();

  const startup = window as StartupWindow;
  const htmlInlineScriptAt = startup.__orgnoteStartup?.htmlInlineScriptAt;

  if (typeof htmlInlineScriptAt === 'number') {
    recordEventAt(BOOT_SCOPE, 'html-inline-script', htmlInlineScriptAt);
  }

  recordEvent(BOOT_SCOPE, 'first-boot-file-started');
  bootTimer.start('total');
});
