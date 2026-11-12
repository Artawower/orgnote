import type { Command, CommandHandlerParams, CommandIcon } from 'orgnote-api';
import { DefaultCommands, KEYBINDING_CONTEXTS, RouteNames, i18n, I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { useRouteActive } from 'src/composables/use-route-active';
import TheSettings from 'src/containers/TheSettings.vue';
import { createSettingsRouter } from 'src/containers/modal-settings-routes';
import AppIcon from 'src/components/AppIcon.vue';
import { getDatabase } from 'src/infrastructure/repositories';
import { to } from 'orgnote-api/utils';
import { defineAsyncComponent, defineComponent, h } from 'vue';
import AppAvatar from 'src/components/AppAvatar.vue';
import { usePanePersistence } from 'src/composables/pane-persistence';
import { downloadTextFile } from 'src/utils/download-text-file';
import type { Router } from 'vue-router';
import { buildLocalSyncProfileToml } from 'src/utils/local-sync-profile-config';
import { getUsePackageInstructions } from 'src/constants/install-scripts';
import { getCliInstallInstructions } from 'src/constants/cli-install-scripts';
import { isSelfHostedServer } from './command-guards';

type TheSettingsModalProps = {
  initialRoute?: RouteNames;
  settingsRouter?: Router;
};

const SettingsHeaderTitle = defineAsyncComponent(
  () => import('src/containers/SettingsHeaderTitle.vue'),
);

const ExtensionManager = defineAsyncComponent(() => import('src/containers/ExtensionManager.vue'));
const routeNameSet = new Set(Object.values(RouteNames));

const isRouterValue = (value: unknown): value is Router => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const routerLike = value as { push?: unknown; currentRoute?: unknown };
  return typeof routerLike.push === 'function' && !!routerLike.currentRoute;
};

const isRouteName = (value: unknown): value is RouteNames => {
  if (typeof value !== 'string') {
    return false;
  }

  return routeNameSet.has(value as RouteNames);
};

const getModalSettingsProps = (modalProps: unknown): TheSettingsModalProps | undefined => {
  if (!modalProps || typeof modalProps !== 'object') {
    return;
  }

  const candidate = modalProps as { settingsRouter?: unknown; initialRoute?: unknown };
  if (!isRouterValue(candidate.settingsRouter)) {
    return;
  }

  if (candidate.initialRoute !== undefined && !isRouteName(candidate.initialRoute)) {
    return;
  }

  return {
    settingsRouter: candidate.settingsRouter,
    initialRoute: candidate.initialRoute,
  };
};

const getRouterFromSettingsModal = (): Router | undefined => {
  const modal = api.ui.useModal();
  const modalComponent = modal.component;
  if (!modalComponent || modalComponent !== TheSettings) {
    return;
  }

  const modalProps = getModalSettingsProps(modal.config?.modalProps);
  return modalProps?.settingsRouter;
};

const createSettingsHeaderTitle = (settingsRouter: Router) => {
  return defineComponent({
    name: 'SettingsHeaderTitleBridge',
    setup() {
      return () => h(SettingsHeaderTitle, { settingsRouter });
    },
  });
};

const SettingsCommandIcon = defineComponent({
  name: 'SettingsCommandIcon',
  setup() {
    const auth = api.core.useAuth();

    return () => {
      const avatarUrl = auth.user?.avatarUrl;
      if (!avatarUrl) {
        return h(AppIcon, { name: 'sym_o_settings', size: 'sm' });
      }

      return h(AppAvatar, { url: avatarUrl, size: 'xs' });
    };
  },
});

export function getSettingsCommands(): Command[] {
  const confirmationModal = api.ui.useConfirmationModal();
  const notifications = api.core.useNotifications();

  const copyLocalSyncConfig = async (): Promise<void> => {
    const result = await to(async () => {
      const content = buildLocalSyncProfileToml(api);
      await api.utils.copyToClipboard(content);
    })();

    if (result.isErr()) {
      reporter.reportError(result.error);
      return;
    }

    notifications.notify({
      message: I18N.SYNC_PROFILE_CONFIG_EXPORTED,
      description: I18N.SYNC_PROFILE_CONFIG_EXPORTED_DESCRIPTION,
      level: 'info',
    });
  };

  const downloadLocalSyncConfig = async (): Promise<void> => {
    const result = await to(async () => {
      const content = buildLocalSyncProfileToml(api);
      downloadTextFile('orgnote-sync-profile.toml', content);
    })();

    if (result.isErr()) {
      reporter.reportError(result.error);
      return;
    }

    notifications.notify({
      message: I18N.SYNC_PROFILE_CONFIG_DOWNLOADED,
      description: I18N.SYNC_PROFILE_CONFIG_DOWNLOADED_DESCRIPTION,
      level: 'info',
    });
  };

  const copyEmacsUsePackageConfig = async (): Promise<void> => {
    const result = await to(async () => api.utils.copyToClipboard(getUsePackageInstructions()))();

    if (result.isErr()) {
      reporter.reportError(result.error);
      return;
    }

    notifications.notify({
      message: I18N.EMACS_USE_PACKAGE_CONFIG_COPIED,
      description: I18N.EMACS_USE_PACKAGE_CONFIG_COPIED_DESCRIPTION,
      level: 'info',
    });
  };

  const copyCliInstallCommand = async (): Promise<void> => {
    const result = await to(async () => api.utils.copyToClipboard(getCliInstallInstructions()))();

    if (result.isErr()) {
      reporter.reportError(result.error);
      return;
    }

    notifications.notify({
      message: I18N.CLI_INSTALL_COMMAND_COPIED,
      description: I18N.CLI_INSTALL_COMMAND_COPIED_DESCRIPTION,
      level: 'info',
    });
  };

  const isActiveRoute = (routeName: RouteNames): boolean => {
    const settingsRouter = getRouterFromSettingsModal();
    if (!settingsRouter) {
      return false;
    }
    const { isActive } = useRouteActive(settingsRouter);
    return isActive(routeName);
  };

  const openSettingsRoute = (routeName: RouteNames) => {
    const modal = api.ui.useModal();
    const isModalOpened = modal.component === TheSettings;

    if (!isModalOpened) {
      const settingsRouter = createSettingsRouter();
      modal.open(TheSettings, {
        title: 'settings',
        closable: true,
        wide: true,
        noBodyPadding: true,
        headerTitleComponent: createSettingsHeaderTitle(settingsRouter),
        modalProps: {
          initialRoute: routeName,
          settingsRouter,
        },
      });
      return;
    }

    const settingsRouter = getRouterFromSettingsModal();
    if (!settingsRouter) {
      return;
    }

    to(() => settingsRouter.push({ name: routeName }))().then((result) => {
      if (result.isErr()) reporter.reportError(result.error);
    });
  };

  const settingsIcon: CommandIcon = SettingsCommandIcon;

  const commands: Command[] = [
    {
      command: DefaultCommands.SETTINGS,
      group: 'global',
      icon: settingsIcon,
      interactive: true,
      keybindingContext: KEYBINDING_CONTEXTS.GLOBAL,
      defaultHotkeys: [{ key: ',', modifiers: ['Mod'] }],
      handler: () => openSettingsRoute(RouteNames.SettingsPage),
      isActive: () => isActiveRoute(RouteNames.SettingsPage),
    },
    {
      command: DefaultCommands.STORAGE_SETTINGS,
      group: 'settings',
      icon: 'sym_o_save',
      handler: () => openSettingsRoute(RouteNames.StorageSettings),
      isActive: () => isActiveRoute(RouteNames.StorageSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.SYSTEM_SETTINGS,
      group: 'settings',
      icon: 'sym_o_settings',
      handler: () => openSettingsRoute(RouteNames.SystemSettings),
      isActive: () => isActiveRoute(RouteNames.SystemSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.LANGUAGE_SETTINGS,
      group: 'settings',
      icon: 'language',
      handler: () => openSettingsRoute(RouteNames.LanguageSettings),
      isActive: () => isActiveRoute(RouteNames.LanguageSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.INTERFACE_SETTINGS,
      group: 'settings',
      icon: 'sym_o_wallpaper',
      handler: () => openSettingsRoute(RouteNames.InterfaceSettings),
      isActive: () => isActiveRoute(RouteNames.InterfaceSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.OPEN_GRAPH_SETTINGS,
      group: 'settings',
      icon: 'sym_o_hub',
      handler: () => openSettingsRoute(RouteNames.GraphSettings),
      isActive: () => isActiveRoute(RouteNames.GraphSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.SYNCHRONISATION_SETTINGS,
      group: 'settings',
      icon: 'sym_o_sync',
      handler: () => openSettingsRoute(RouteNames.SynchronisationSettings),
      isActive: () => isActiveRoute(RouteNames.SynchronisationSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.COPY_CLI_INSTALL_COMMAND,
      group: 'settings',
      icon: 'terminal',
      description: I18N.CLI_INSTALL_COMMAND_COPIED_DESCRIPTION,
      handler: copyCliInstallCommand,
    },
    {
      command: DefaultCommands.EXPORT_LOCAL_SYNC_CONFIG,
      group: 'settings',
      icon: 'content_copy',
      description: I18N.SYNC_PROFILE_CONFIG_EXPORTED_DESCRIPTION,
      handler: copyLocalSyncConfig,
    },
    {
      command: DefaultCommands.DOWNLOAD_LOCAL_SYNC_CONFIG,
      group: 'settings',
      icon: 'download',
      description: I18N.SYNC_PROFILE_CONFIG_DOWNLOADED_DESCRIPTION,
      handler: downloadLocalSyncConfig,
    },
    {
      command: DefaultCommands.COPY_EMACS_USE_PACKAGE_CONFIG,
      group: 'settings',
      icon: 'integration_instructions',
      description: I18N.EMACS_USE_PACKAGE_CONFIG_COPIED_DESCRIPTION,
      handler: copyEmacsUsePackageConfig,
    },
    {
      command: DefaultCommands.SUBSCRIPTION_SETTINGS,
      group: 'settings',
      icon: 'sym_o_loyalty',
      hide: isSelfHostedServer,
      disabled: isSelfHostedServer,
      handler: () => {
        if (isSelfHostedServer()) return;
        openSettingsRoute(RouteNames.SubscriptionSettings);
      },
      isActive: () => isActiveRoute(RouteNames.SubscriptionSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.KEYBINDINGS_SETTINGS,
      group: 'settings',
      icon: 'keyboard',
      handler: () => openSettingsRoute(RouteNames.KeybindingSettings),
      isActive: () => isActiveRoute(RouteNames.KeybindingSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.DEVELOPER_SETTINGS,
      group: 'settings',
      icon: 'sym_o_terminal',
      handler: () => openSettingsRoute(RouteNames.DeveloperSettings),
      isActive: () => isActiveRoute(RouteNames.DeveloperSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.EXTENSIONS_SETTINGS,
      group: 'settings',
      icon: 'sym_o_extension',
      handler: () => openSettingsRoute(RouteNames.ExtensionsSettings),
      isActive: () => isActiveRoute(RouteNames.ExtensionsSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.OPEN_EXTENSIONS_MANAGER,
      group: 'global',
      icon: 'sym_o_extension',
      handler: () => {
        const modal = api.ui.useModal();
        modal.open(ExtensionManager, {
          title: i18n.EXTENSIONS,
          closable: true,
          wide: true,
        });
      },
    },
    {
      command: DefaultCommands.ENCRYPTION_SETTINGS,
      group: 'settings',
      icon: 'sym_o_extension',
      handler: () => openSettingsRoute(RouteNames.EncryptionSettings),
      isActive: () => isActiveRoute(RouteNames.EncryptionSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.API_SETTINGS,
      group: 'settings',
      icon: 'sym_o_hub',
      handler: () => openSettingsRoute(RouteNames.ApiSettings),
      isActive: () => isActiveRoute(RouteNames.ApiSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.AUTHENTICATION_SETTINGS,
      group: 'settings',
      icon: 'sym_o_person',
      handler: () => openSettingsRoute(RouteNames.AuthenticationSettings),
      isActive: () => isActiveRoute(RouteNames.AuthenticationSettings),
      context: {
        narrow: true,
      },
    },
    {
      command: DefaultCommands.RESET_SYSTEM,
      icon: 'sym_o_update',
      group: 'settings',
      description: i18n.RESET_SYSTEM_DESCRIPTION,
      handler: async (api, params: CommandHandlerParams<{ force?: boolean }>) => {
        const confirm =
          params.data?.force ||
          (await confirmationModal.confirm({
            title: i18n.RESET_SYSTEM,
            message: i18n.RESET_SYSTEM_WARNING,
          }));

        if (!confirm) {
          return;
        }

        const panePersistence = usePanePersistence();
        panePersistence.stop();

        const fileSystem = api.core.useFileSystem();
        const clearResult = await to(
          () => fileSystem.removeAllFiles(),
          'Failed to clear file system',
        )();

        if (clearResult.isErr()) {
          reporter.reportError(clearResult.error);
          return;
        }

        const db = getDatabase();
        await db?.delete();

        localStorage.clear();
        sessionStorage.clear();

        window.location.reload();
      },
    },
    {
      command: DefaultCommands.DELETE_ALL_NOTES,
      icon: 'sym_o_event_busy',
      group: 'settings',
      handler: async () => {
        await confirmationModal.confirm({
          title: i18n.DELETE_ALL_NOTES,
          message: i18n.CONFIRM_DELETE_NOTES,
        });
      },
    },
    {
      command: DefaultCommands.DELETE_ACCOUNT,
      icon: 'sym_o_event_busy',
      group: 'settings',
      handler: async () => {
        await confirmationModal.confirm({
          title: i18n.REMOVE_ACCOUNT,
          message: i18n.CONFIRM_DELETE_ACCOUNT,
        });
      },
    },
  ];

  return commands;
}
