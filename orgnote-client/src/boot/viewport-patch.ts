import { defineBoot } from '@quasar/app-vite/wrappers';
import { iosOnly } from 'src/utils/platform-specific';

export default defineBoot(async () => {
  await iosOnly(async () => {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setScroll({ isDisabled: true });
  })();
});
