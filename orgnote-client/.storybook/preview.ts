import type { Preview } from '@storybook/vue3-vite';
import '@quasar/extras/roboto-font/roboto-font.css';
import '@quasar/extras/animate/fadeInUp.css';
import '@quasar/extras/animate/fadeOutDown.css';
import '@quasar/extras/animate/fadeInRight.css';
import '@quasar/extras/animate/fadeOutRight.css';

import '@quasar/extras/roboto-font/roboto-font.css';
import '@quasar/extras/material-icons/material-icons.css';
import '@quasar/extras/material-icons-outlined/material-icons-outlined.css';
import '@quasar/extras/material-symbols-outlined/material-symbols-outlined.css';
import '@quasar/extras/fontawesome-v6/fontawesome-v6.css';

import 'quasar/dist/quasar.css';
import '../src/css/app.scss';
import { setup } from '@storybook/vue3-vite';
import { i18n } from '../src/boot/i18n';
import { ORGNOTE_API_PROVIDER_TOKEN } from '../src/constants/app-providers';

import { QBtn, QDate, QIcon, QLinearProgress, Quasar } from 'quasar';
import { createPinia } from 'pinia';
import './global.css';

setup((app) => {
  (app.config as typeof app.config & { devtools?: boolean }).devtools = false;
  app.use(Quasar, {
    components: {
      QIcon,
      QBtn,
      QDate,
      QLinearProgress,
    },
  });
  app.use(i18n);
  app.use(createPinia());

  // Mock API for Storybook
  const mockApi = {
    core: {
      app,
      useNotifications: () => ({
        notify: (notification: unknown) => {
          console.log('Notification:', notification);
        },
      }),
    },
  };

  app.provide(ORGNOTE_API_PROVIDER_TOKEN, mockApi);
  window.orgnote = mockApi;

  import('../src/boot/api')
    .then(({ api }) => {
      if (api) Object.assign(api, mockApi);
    })
    .catch(() => {
      // api boot not available in storybook context — mock covered via provide + window
    });
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
