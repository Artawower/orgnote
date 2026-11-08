import { defineBoot } from '@quasar/app-vite/wrappers';
import { BOOT_SCOPE, bootTimer, recordEvent } from 'src/boot/perf-timer';

export default defineBoot(() => {
  recordEvent(BOOT_SCOPE, 'boot-complete');
  bootTimer.end('total');
});
