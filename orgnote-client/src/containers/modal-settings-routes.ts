import type { RouteRecordRaw, Router } from 'vue-router';
import { createRouter, createMemoryHistory } from 'vue-router';
import { RouteNames } from 'orgnote-api';
import { useServerEnvironmentStore } from 'src/stores/server-environment';

const guardSubscriptionSettings = async () => {
  const serverEnvironment = useServerEnvironmentStore();
  await serverEnvironment.load();
  return serverEnvironment.isSelfHosted ? { name: RouteNames.SettingsPage } : true;
};

const settingsMenuRoute: RouteRecordRaw = {
  path: '/',
  name: RouteNames.SettingsPage,
  component: () => import('./SettingsMenu.vue'),
};

export function createSettingsRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      settingsMenuRoute,
      {
        name: RouteNames.AuthenticationSettings,
        path: '/settings/authentication',
        component: () => import('./AuthenticationSettings.vue'),
      },
      {
        name: RouteNames.SystemSettings,
        path: '/settings/system',
        component: () => import('./SystemSettings.vue'),
      },
      {
        name: RouteNames.StorageSettings,
        path: '/settings/storage',
        component: () => import('./StorageSettings.vue'),
      },
      {
        name: RouteNames.LanguageSettings,
        path: '/settings/language',
        component: () => import('./LanguageSettings.vue'),
      },
      {
        name: RouteNames.InterfaceSettings,
        path: '/settings/interface',
        component: () => import('./InterfaceSettings.vue'),
      },
      {
        name: RouteNames.SynchronisationSettings,
        path: '/settings/synchronisation',
        component: () => import('./SynchronisationSettings.vue'),
      },
      {
        name: RouteNames.SubscriptionSettings,
        path: '/settings/subscription',
        component: () => import('./SubscriptionSettings.vue'),
        beforeEnter: guardSubscriptionSettings,
      },
      {
        name: RouteNames.KeybindingSettings,
        path: '/settings/keybindings',
        component: () => import('./KeybindingSettings.vue'),
      },
      {
        name: RouteNames.EncryptionSettings,
        path: '/settings/encryption',
        component: () => import('./EncryptionSettings.vue'),
      },
      {
        name: RouteNames.DeveloperSettings,
        path: '/settings/developer',
        component: () => import('./DeveloperSettings.vue'),
      },
      {
        name: RouteNames.ExtensionsSettings,
        path: '/settings/extensions',
        component: () => import('./ExtensionsSettings.vue'),
      },
      {
        name: RouteNames.ApiSettings,
        path: '/settings/api',
        component: () => import('./ApiSettings.vue'),
      },
      {
        name: RouteNames.GraphSettings,
        path: '/settings/graph',
        component: () => import('./GraphSettings.vue'),
      },
    ],
  });

  return router;
}
