import type { Command } from 'orgnote-api';
import {
  DefaultCommands,
  KEYBINDING_CONTEXTS,
  i18n,
  I18N,
  isOrgGpgFile,
  buildBufferUri,
  generateGpgKeys,
  RouteNames,
} from 'orgnote-api';
import { api } from 'src/boot/api';
import { GITHUB_LINK, PATREON_LINK, WIKI_LINK } from 'src/constants/external-link';
import { ISSUE_PAGE } from 'src/constants/issue-page';
import { openExternalUrl } from 'src/utils/open-external-url';
import { clientOnly } from 'src/utils/platform-specific';
import LogsContainer from 'src/containers/LogsContainer.vue';
import SystemInfoContainer from 'src/containers/SystemInfoContainer.vue';
import NotificationsInboxContainer from 'src/containers/NotificationsInboxContainer.vue';
import NotificationsCommandIcon from 'src/components/NotificationsCommandIcon.vue';
import GenerateGpgKeysModal from 'src/containers/GenerateGpgKeysModal.vue';
import type { GenerateGpgKeysModalResult } from 'src/models/gpg-keys-modal-result';
import { to } from 'orgnote-api/utils';
import { type Router } from 'vue-router';
import { reporter } from 'src/boot/report';
import { isNotActiveUser } from './command-guards';
import { useEncryptedNotesWarning } from 'src/composables/use-encrypted-notes-warning';
import { GRAPH_BUFFER_URI } from 'src/constants/graph-buffer';
import { CLIENT_UPDATE_NOTIFICATION_ID } from 'src/constants/client-update';
import { i18n as i18nInstance } from 'src/boot/i18n';

const getActiveFilePath = (): string | undefined => {
  const tab = api.core.usePane().activeTab;
  const path = tab?.router.currentRoute.value?.params?.path;
  if (!path) return;
  return Array.isArray(path) ? path.join('/') : path;
};

const isEncryptionEnabled = (): boolean =>
  api.core.useConfig().config.encryption.type !== 'disabled';

const isActiveFileEncrypted = (): boolean => {
  const path = getActiveFilePath();
  return !!path && isOrgGpgFile(path);
};

const isEncryptCommandDisabled = (): boolean =>
  !isEncryptionEnabled() || !getActiveFilePath() || isActiveFileEncrypted();

const withEncryptionGuard = async (fn: () => Promise<void>): Promise<void> => {
  const { confirmEncryptionChange } = useEncryptedNotesWarning();
  if (!(await confirmEncryptionChange())) return;
  await fn();
};

const uploadEncryptionKey = (field: 'privateKey' | 'publicKey') =>
  withEncryptionGuard(async () => {
    const file = await api.utils.uploadFile();
    if (!file) return;
    const { config } = api.core.useConfig();
    if (config.encryption.type !== 'gpgKeys') return;
    config.encryption[field] = await file.text();
  });

const normalizeText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const extractUsernameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] ?? '';
  return normalizeText(localPart);
};

const resolveGpgIdentity = (email: string) => {
  const auth = api.core.useAuth();
  const user = auth.user;
  const normalizedEmail = normalizeText(email);
  const username =
    normalizeText(user?.nickName) ||
    normalizeText(user?.name) ||
    extractUsernameFromEmail(normalizedEmail);

  return { username, email: normalizedEmail };
};

const openGenerateGpgKeysModal = async (): Promise<GenerateGpgKeysModalResult | undefined> => {
  const auth = api.core.useAuth();
  return await api.ui
    .useModal()
    .open<GenerateGpgKeysModalResult | undefined>(GenerateGpgKeysModal, {
      title: I18N.GENERATE_GPG_KEYS,
      mini: true,
      position: 'bottom',
      modalProps: {
        email: auth.user?.email,
      },
    });
};

const generateAndSaveGpgKeys = async (): Promise<void> => {
  const modalResult = await openGenerateGpgKeysModal();
  if (!modalResult) return;

  const identity = resolveGpgIdentity(modalResult.email);
  const generated = await to(generateGpgKeys)({
    username: identity.username,
    email: identity.email,
    passphrase: modalResult.passphrase,
  });

  if (generated.isErr()) {
    reporter.reportError(generated.error);
    return;
  }

  const { config } = api.core.useConfig();
  const encryptFilesByDefault = config.encryption.encryptFilesByDefault;
  config.encryption = {
    type: 'gpgKeys',
    privateKey: generated.value.privateKey,
    publicKey: generated.value.publicKey,
    privateKeyPassphrase: modalResult.passphrase,
    encryptFilesByDefault,
  };
};

const isDecryptCommandDisabled = (): boolean =>
  !isEncryptionEnabled() || !getActiveFilePath() || !isActiveFileEncrypted();

const ensureDestinationAvailable = async (path: string): Promise<void> => {
  const fm = api.core.useFileSystemManager();
  if (!fm.currentFs) return;
  const exists = await fm.currentFs.isFileExist(path);
  if (!exists) return;
  throw new Error(`File already exists: ${path}`);
};

const rewriteAndReopen = async (oldPath: string, newPath: string): Promise<void> => {
  const fs = api.core.useFileSystem();
  const bufferViewer = api.core.useBufferViewer();
  const buffers = api.core.useBuffers();
  const provider = api.core.useBufferProviders().get('file');

  const oldUri = buildBufferUri('file', oldPath);
  const newUri = buildBufferUri('file', newPath);

  const buffer = buffers.getBufferByUri(oldUri);

  if (!buffer || !provider?.write) {
    throw new Error('Buffer or file provider is not available');
  }

  await ensureDestinationAvailable(newPath);

  const content = new Uint8Array(buffer.rawContent);

  await provider.write(newPath, content);
  await buffers.closeBuffer(oldUri, true);
  await fs.deleteFile(oldPath);
  await bufferViewer.open(newUri);
};

const safeRewriteAndReopen = async (oldPath: string, newPath: string): Promise<void> => {
  const result = await to(rewriteAndReopen)(oldPath, newPath);
  if (result.isOk()) return;
  reporter.reportError(result.error);
};

export function getGlobalCommands(router: Router): Command[] {
  const sidebarStore = api.ui.useSidebar();
  const rightSidebarStore = api.ui.useRightSidebar();
  const modalStore = api.ui.useModal();
  const commands: Command[] = [
    {
      command: DefaultCommands.HISTORY_BACK,
      icon: 'sym_o_arrow_back',
      group: 'navigation',
      interactive: true,
      keybindingContext: KEYBINDING_CONTEXTS.SHELL,
      defaultHotkeys: [{ key: '[', modifiers: ['Mod'] }],
      handler: (api) => {
        api.core.usePane().activeTab?.router?.back();
      },
    },
    {
      command: DefaultCommands.HISTORY_FORWARD,
      icon: 'sym_o_arrow_forward',
      group: 'navigation',
      interactive: true,
      keybindingContext: KEYBINDING_CONTEXTS.SHELL,
      defaultHotkeys: [{ key: ']', modifiers: ['Mod'] }],
      handler: (api) => {
        api.core.usePane().activeTab?.router?.forward();
      },
    },
    {
      command: DefaultCommands.OPEN_GRAPH,
      icon: 'sym_o_hub',
      group: 'navigation',
      handler: async (api): Promise<void> => {
        if (router.currentRoute.value.name !== RouteNames.Panes) {
          await router.push({ name: RouteNames.Panes });
        }
        await api.core.useLayout().ensureLayout();
        await api.core.useBufferViewer().open(GRAPH_BUFFER_URI);
      },
    },
    {
      command: DefaultCommands.REPORT_BUG,
      group: 'debug',
      handler: clientOnly(() => openExternalUrl(ISSUE_PAGE)),
    },
    {
      command: DefaultCommands.OPEN_SYSTEM_INFO,
      description: I18N.VISIT_DEBUG_INFO,
      icon: 'sym_o_info',
      group: 'debug',
      handler: () => {
        modalStore.open(SystemInfoContainer, { title: i18n.SYSTEM_INFO, wide: true });
      },
    },
    {
      command: DefaultCommands.SHOW_LOGS,
      group: 'debug',
      icon: 'sym_o_bug_report',
      handler: () => {
        modalStore.open(LogsContainer, { title: I18N.LOGS, wide: true });
      },
    },
    {
      command: DefaultCommands.SHOW_LATEST_CHANGES,
      group: 'global',
      icon: 'sym_o_new_releases',
      handler: async () => {
        const clientUpdate = api.core.useClientUpdate();
        const notifications = api.core.useNotifications();
        const update = await clientUpdate.loadLatestChangelog();

        if (!update) {
          notifications.notify({
            message: i18nInstance.global.t(I18N.NO_LATEST_CHANGES),
            level: 'info',
          });
          return;
        }

        const { default: ClientUpdateContainer } = await import(
          'src/containers/ClientUpdateContainer.vue'
        );

        modalStore.open(ClientUpdateContainer, {
          title: I18N.SHOW_LATEST_CHANGES,
          wide: true,
          modalProps: { update },
        });
        clientUpdate.markChangelogAsRead();
        notifications.delete(CLIENT_UPDATE_NOTIFICATION_ID);
      },
    },
    {
      command: DefaultCommands.CLEAR_LOGS,
      group: 'debug',
      icon: 'delete',
      handler: async () => {
        const { confirm } = api.ui.useConfirmationModal();

        const confirmed = await confirm({
          message: I18N.CONFIRM_CLEAR_LOGS,
        });

        if (confirmed) {
          const logStore = api.core.useLog();
          logStore.clearLogs();
        }
      },
    },
    {
      command: DefaultCommands.TOGGLE_SIDEBAR,
      group: 'global',
      interactive: true,
      keybindingContext: KEYBINDING_CONTEXTS.SHELL,
      defaultHotkeys: [{ key: 'b', modifiers: ['Mod'] }],
      icon: () => {
        // TODO: feat/stable-beta also make as ref
        return sidebarStore.opened ? 'arrow_circle_left' : 'menu';
      },
      handler: (api) => {
        if (!sidebarStore.opened) {
          api.core.useCommands().execute(DefaultCommands.EDITOR_HIDE_KEYBOARD);
        }
        sidebarStore.toggle();
      },
    },
    {
      command: DefaultCommands.OPEN_NOTIFICATIONS,
      group: 'global',
      icon: NotificationsCommandIcon,
      handler: () => {
        rightSidebarStore.openComponent(NotificationsInboxContainer);
      },
    },
    {
      command: DefaultCommands.CLOSE_SIDEBAR,
      group: 'global',
      icon: 'arrow_circle_left',
      handler: () => {
        sidebarStore.close();
      },
    },
    {
      command: DefaultCommands.OPEN_SIDEBAR,
      group: 'global',
      icon: 'menu',
      handler: (api) => {
        api.core.useCommands().execute(DefaultCommands.EDITOR_HIDE_KEYBOARD);
        if (!sidebarStore.component) {
          api.core.useCommands().execute(DefaultCommands.TOGGLE_FILE_MANAGER);
          return;
        }
        sidebarStore.open();
      },
    },
    {
      command: DefaultCommands.PROJECT_INFO,
      icon: 'o_info',
      group: 'global',
      handler: (api) => {
        api.core.useBufferViewer().open('remote:///docs/info.org');
      },
    },
    {
      command: DefaultCommands.SYNC_FILES,
      icon: 'sync',
      group: 'global',
      interactive: true,
      keybindingContext: KEYBINDING_CONTEXTS.GLOBAL,
      defaultHotkeys: [{ key: 's', modifiers: ['Mod', 'Shift'] }],
      hide: isNotActiveUser,
      disabled: isNotActiveUser,
      handler: async (api) => {
        const ok = await api.ui.useConfirmationModal().confirm({
          title: i18n.SYNC_FILES,
          message: i18n.SYNC_FILES_DESCRIPTION,
        });
        if (!ok) {
          return;
        }
        const res = await to(api.core.useSync().sync)();
        if (res.isErr()) {
          reporter.reportError(res.error);
        }
      },
    },
    {
      command: DefaultCommands.ENCRYPT_NOTE,
      icon: 'sym_o_encrypted',
      description: I18N.ENCRYPT_ACTIVE_NOTE,
      hide: isEncryptCommandDisabled,
      disabled: isEncryptCommandDisabled,
      group: 'global',
      handler: async () => {
        const path = getActiveFilePath();
        if (!path || isOrgGpgFile(path)) return;
        const encryptedPath = `${path}.gpg`;
        await safeRewriteAndReopen(path, encryptedPath);
      },
    },
    {
      command: DefaultCommands.DECRYPT_NOTE,
      icon: 'sym_o_remove_moderator',
      description: I18N.DECRYPT_ACTIVE_NOTE,
      hide: isDecryptCommandDisabled,
      disabled: isDecryptCommandDisabled,
      group: 'global',
      handler: async () => {
        const path = getActiveFilePath();
        if (!path || !isOrgGpgFile(path)) return;
        const decryptedPath = path.replace(/\.gpg$/, '');
        await safeRewriteAndReopen(path, decryptedPath);
      },
    },
    {
      command: DefaultCommands.SOURCE_CODE,
      icon: 'fa-brands fa-github-alt',
      description: I18N.CHECK_GITHUB_SOURCE_CODE,
      group: 'global',
      handler: () => openExternalUrl(GITHUB_LINK),
    },
    {
      command: DefaultCommands.READ_WIKI,
      icon: 'sym_o_help',
      group: 'global',
      handler: () => openExternalUrl(WIKI_LINK),
    },
    {
      command: DefaultCommands.SPONSOR,
      icon: 'sym_o_savings',
      group: 'global',
      handler: () => openExternalUrl(PATREON_LINK),
    },
    {
      command: DefaultCommands.UPLOAD_PRIVATE_KEY,
      icon: 'sym_o_key',
      group: 'encryption',
      handler: () => uploadEncryptionKey('privateKey'),
    },
    {
      command: DefaultCommands.UPLOAD_PUBLIC_KEY,
      icon: 'sym_o_key',
      group: 'encryption',
      handler: () => uploadEncryptionKey('publicKey'),
    },
    {
      command: DefaultCommands.GENERATE_GPG_KEYS,
      icon: 'sym_o_vpn_key',
      group: 'encryption',
      handler: () => withEncryptionGuard(generateAndSaveGpgKeys),
    },
  ];

  return commands;
}
