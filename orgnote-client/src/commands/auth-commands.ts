import type { Command } from 'orgnote-api';
import { DefaultCommands, RouteNames, i18n } from 'orgnote-api';
import type { Router } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { isAuthenticated, isNotAuthenticated } from './command-guards';

export const createAuthCommands = (router: Router): Command[] => {
  const logoutCommand: Command = {
    command: DefaultCommands.LOGOUT,
    title: i18n.AUTH_LOGOUT,
    description: i18n.AUTH_LOGOUT_DESCRIPTION,
    group: i18n.AUTH_GROUP,
    icon: 'logout',
    hide: isNotAuthenticated,
    disabled: isNotAuthenticated,
    handler: async (api) => {
      const authStore = useAuthStore();
      const commands = api.core.useCommands();
      await commands.execute(DefaultCommands.DELETE_ALL_DATA, { force: true });
      await authStore.logout();
    },
  };

  const loginCommand: Command = {
    command: DefaultCommands.LOGIN,
    title: i18n.AUTH_LOGIN,
    description: i18n.AUTH_LOGIN_DESCRIPTION,
    group: i18n.AUTH_GROUP,
    icon: 'login',
    hide: isAuthenticated,
    disabled: isAuthenticated,
    handler: () => {
      router.push({ name: RouteNames.AuthPage, params: { initialProvider: 'github' } });
    },
  };

  const removeAccountCommand: Command = {
    command: DefaultCommands.REMOVE_ACCOUNT,
    title: i18n.REMOVE_ACCOUNT,
    description: i18n.AUTH_REMOVE_ACCOUNT_DESCRIPTION,
    group: i18n.AUTH_GROUP,
    icon: 'person_remove',
    hide: isNotAuthenticated,
    disabled: isNotAuthenticated,
    handler: async () => {
      const authStore = useAuthStore();
      await authStore.removeUserAccount();
    },
  };

  return [logoutCommand, loginCommand, removeAccountCommand];
};
