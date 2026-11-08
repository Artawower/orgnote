import path from 'path';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    quasar({}),
  ],
  // research dart-sass deprecation warning
  // css: {
  //   preprocessorOptions: {
  //     scss: {
  //       additionalData: `
  //       @import "src/css/mixins.scss";
  //       @import "src/css/quasar.variables.scss";
  //       @import "src/css/colors.scss";
  //       @import "src/css/app.scss";`,
  //     },
  //   },
  // },
  test: {
    include: ['src/**/*.spec.ts', 'src-electron/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    environment: 'happy-dom',
    globals: true,
    css: false,
    setupFiles: ['./test/init-env.ts', './test/setup-tests.ts'],
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
      components: path.resolve(__dirname, './src/components'),
      images: path.resolve(__dirname, './images'),
      icons: path.resolve(__dirname, './public/icons'),
      test: path.resolve(__dirname, './test'),
      '#q-app/wrappers': path.resolve(__dirname, './test/mocks/q-app-wrappers.ts'),
    },
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg'],
});
