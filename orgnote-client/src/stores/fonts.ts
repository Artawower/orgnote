import { defineStore, storeToRefs } from 'pinia';
import type { FontStore, FontCategory, FontDefinition, FontCategoryConfig } from 'orgnote-api';
import { getFileExtension } from 'orgnote-api';
import { computed, ref, watch } from 'vue';
import { useConfigStore } from './config';
import { useFileSystemStore } from './file-system';
import { DEFAULT_FONTS, DEFAULT_FONT_FAMILIES } from 'src/constants/fonts';
import { applyCSSVariables, applyScopedStyles } from 'src/utils/css-utils';

const FONT_STYLE_ELEMENT_ID = 'orgnote-dynamic-fonts';

const FONT_CSS_VARIABLES: Record<FontCategory, string> = {
  main: '--main-font-family',
  editor: '--editor-font-family-main',
  headline: '--headline-font-family',
  code: '--code-font-family',
};

export const useFontStore = defineStore<'fonts', FontStore>('fonts', () => {
  const { config } = storeToRefs(useConfigStore());
  const fileSystem = useFileSystemStore();

  const customFonts = ref<FontDefinition[]>([]);
  const loadedBlobUrls = ref<Map<string, string>>(new Map());

  const availableFonts = computed<FontDefinition[]>(() => [...DEFAULT_FONTS, ...customFonts.value]);

  const activeFonts = computed<FontCategoryConfig>(() => ({
    main: config.value.ui.fonts?.main ?? DEFAULT_FONT_FAMILIES.main,
    editor: config.value.ui.fonts?.editor ?? DEFAULT_FONT_FAMILIES.editor,
    headline: config.value.ui.fonts?.headline ?? DEFAULT_FONT_FAMILIES.headline,
    code: config.value.ui.fonts?.code ?? DEFAULT_FONT_FAMILIES.code,
  }));

  const loadFontFromFilePath = async (font: FontDefinition): Promise<string | null> => {
    if (!font.filePath) return null;

    const cached = loadedBlobUrls.value.get(font.id);
    if (cached) return cached;

    const data = await fileSystem.readFile(font.filePath, 'binary');
    if (!data) return null;

    const extension = getFileExtension(font.filePath) ?? 'woff2';
    const mimeType = extension === 'ttf' ? 'font/ttf' : `font/${extension}`;
    const blob = new Blob([data], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    loadedBlobUrls.value.set(font.id, blobUrl);
    return blobUrl;
  };

  const buildFontFaceRule = async (font: FontDefinition): Promise<string | null> => {
    if (!font.filePath) return null;

    const blobUrl = await loadFontFromFilePath(font);
    if (!blobUrl) return null;

    const weight = font.weight ?? 'normal';
    const style = font.style ?? 'normal';
    const display = font.display ?? 'swap';

    return `
@font-face {
  font-family: '${font.family}';
  src: url('${blobUrl}');
  font-weight: ${weight};
  font-style: ${style};
  font-display: ${display};
}`.trim();
  };

  const applyFontVariables = (): void => {
    const variables = Object.fromEntries(
      (Object.keys(FONT_CSS_VARIABLES) as FontCategory[]).map((category) => [
        FONT_CSS_VARIABLES[category].slice(2),
        activeFonts.value[category],
      ]),
    );
    applyCSSVariables(variables);
  };

  const injectFontFaces = async (): Promise<void> => {
    const usedFamilies = new Set(Object.values(activeFonts.value));

    const fontsToInject = availableFonts.value.filter(
      (font) => font.filePath && usedFamilies.has(font.family),
    );

    const fontFaceRules = await Promise.all(fontsToInject.map(buildFontFaceRule));
    applyScopedStyles(FONT_STYLE_ELEMENT_ID, fontFaceRules.filter(Boolean).join('\n\n'));
  };

  const registerFont = (font: FontDefinition): void => {
    const exists = customFonts.value.some((f) => f.id === font.id);
    if (exists) {
      customFonts.value = customFonts.value.map((f) => (f.id === font.id ? font : f));
      return;
    }
    customFonts.value = [...customFonts.value, font];
  };

  const unregisterFont = (fontId: string): void => {
    const blobUrl = loadedBlobUrls.value.get(fontId);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      loadedBlobUrls.value.delete(fontId);
    }
    customFonts.value = customFonts.value.filter((f) => f.id !== fontId);
  };

  const sync = async (): Promise<void> => {
    await injectFontFaces();
    applyFontVariables();
  };

  watch(
    activeFonts,
    async () => {
      await injectFontFaces();
      applyFontVariables();
    },
    { deep: true },
  );

  watch(
    customFonts,
    async () => {
      await injectFontFaces();
    },
    { deep: true },
  );

  return {
    availableFonts,
    activeFonts,
    registerFont,
    unregisterFont,
    sync,
  };
});
