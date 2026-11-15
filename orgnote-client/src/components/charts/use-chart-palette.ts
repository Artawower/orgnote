import { shallowRef, watch, type ShallowRef } from 'vue';
import { useThemeStore } from 'src/stores/theme';

export const useChartPalette = <Palette>(
  createPalette: () => Palette,
): ShallowRef<Palette> => {
  const themeStore = useThemeStore();
  const palette = shallowRef<Palette>(createPalette());
  watch(
    [() => themeStore.effectiveMode, () => themeStore.activeThemeName],
    () => {
      palette.value = createPalette();
    },
    { flush: 'post' },
  );
  return palette;
};
