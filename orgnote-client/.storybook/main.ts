// This file has been automatically migrated to valid ESM format by Storybook.
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/vue3-vite';
import vue from '@vitejs/plugin-vue';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-onboarding', '@chromatic-com/storybook', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  async viteFinal(config) {
    if (config.plugins) {
      config.plugins.push(vue());
    } else {
      config.plugins = [vue()];
    }

    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      src: path.resolve(__dirname, '../src'),
      '#q-app/wrappers': path.resolve(__dirname, './mocks/q-app-wrappers.ts'),
    };

    config.css = {
      preprocessorOptions: {
        scss: {
          additionalData: (content: string, filename: string): string => {
            if (filename.endsWith('app.scss')) {
              return `@import "src/css/quasar.variables.scss";\n${content}`;
            }
            if (filename.endsWith('quasar.variables.scss')) {
              return content;
            }
            return `@import "src/css/quasar.variables.scss";\n@import "src/css/app.scss";\n${content}`;
          },
        },
      },
    };

    config.define = {
      ...config.define,
      'process.env': {
        NODE_ENV: 'development',
        CLIENT: 'true',
      },
    };

    return config;
  },
};
export default config;
