import {
  InlineEmbeddedWidget,
  MultilineEmbeddedWidget,
  OrgLineClass,
  SyncStoreDefinition,
  BufferViewerStoreDefinition,
  CommandsStoreDefinition,
  CommandsGroupStoreDefinition,
  ModalStoreDefinition,
  SettingsStoreDefinition,
  SettingsUiStoreDefinition,
  MultipleUploadParams,
  UploadParams,
  CompletionStoreDefinition,
  PaneStoreDefinition,
  LayoutStoreDefinition,
  FileManagerStoreDefinition,
  UseScreenDetection,
  UseKeyboardState,
  NotificationsStoreDefinition,
  BufferStoreDefinition,
  BufferProviderStoreDefinition,
  Repositories,
  LogStoreDefinition,
  UseSystemInfo,
  ContextMenuStoreDefinition,
  QueueStoreDefinition,
  FileGuardStoreDefinition,
  FileWatcherStoreDefinition,
  BuildOrgNoteUrl,
  AuthStoreDefinition,
  FileSearchStoreDefinition,
  FileMetaStoreDefinition,
  FontStoreDefinition,
  EmbeddedBufferStoreDefinition,
  UseFileContent,
  UseAppResume,
  ClientUpdateStoreDefinition,
  KeybindingsStoreDefinition,
  WorkerStoreDefinition,
} from './models';
import { WebSocketClient } from './websocket/client';
import { WidgetType } from './models/widget-type';
import { NodeType } from 'org-mode-ast';
import { ExtensionStoreDefinition } from './models/extension-store';
import { EditorStoreDefinition } from './models/editor-store';
import { BabelStoreDefinition } from './models/babel-store';
import { FileSystemStoreDefinition } from './models/file-system-store';
import { EncryptionStoreDefinition } from './models/encryption-store';
import { PlatformSpecificFn } from './models/platform-specific';
import { PlatformDetection, PlatformMatch } from './models/platform-detection';
import { UseSplashScreen } from './models/splash-screen';
import {
  GetCssVar,
  GetCssTheme,
  GetNumericCssVar,
  GetCssProperty,
  GetCssNumericProperty,
  ApplyCSSVariables,
  ResetCSSVariables,
  ApplyScopedStyles,
  RemoveScopedStyles,
} from './models/css-utils';
import { ThemeStoreDefinition } from './models/theme-store';
import { UseBackgroundSettings } from './models/ui-store';
import { SidebarStoreDefinition } from './models/sidebar-store';
import { RightSidebarStoreDefinition } from './models/right-sidebar-store';
import { Logger } from './models/logger';
import type { QVueGlobals } from 'quasar';
import { PinnedCommandsStoreDefinition } from './models/pinned-commands-store';
import type { App } from 'vue';
import { UseConfirmationModal } from './models/confirmation-modal';
import { FileSystemManagerStoreDefinition } from './models/file-system-manager-store';
import { ConfigStoreDefinition } from './models/config-store';
import { Router } from 'vue-router';
import type {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { CronStoreDefinition } from './models/cron-store';
import { GitStoreDefinition } from './models/git-store';
import { ExtensionRegistryStoreDefinition } from './models/extension-registry-store';
import { parseToml, stringifyToml } from './utils';
import type {
  OrgNoteFileSystemApi,
  OrgNoteLoggerApi,
} from './models/core-api';

/** @internal */
type WithNodeType<T> = { nodeType: NodeType } & T;

/**
 * Discriminated union describing an editor widget registration.
 *
 * Use {@link WidgetType} to choose the variant:
 * - `Inline` — decorates a single inline node (mark, replace, or widget decoration).
 * - `Multiline` — replaces an entire block node with a custom view.
 * - `LineClass` — attaches CSS classes and DOM attributes to a line containing the target node.
 *
 * @see {@link InlineEmbeddedWidget}
 * @see {@link MultilineEmbeddedWidget}
 * @see {@link OrgLineClass}
 */
export type WidgetMeta =
  | ({ type: WidgetType.Inline } & WithNodeType<InlineEmbeddedWidget>)
  | ({ type: WidgetType.Multiline } & WithNodeType<MultilineEmbeddedWidget>)
  | ({ type: WidgetType.LineClass } & WithNodeType<OrgLineClass>);

/**
 * Low-level infrastructure layer: data repositories and real-time WebSocket connection.
 *
 * Prefer higher-level stores from {@link OrgNoteApi.core} unless you need
 * direct database or socket access.
 */
export type Infrastructure = Repositories & { websocket: WebSocketClient };

/**
 * Environment-neutral services available on the host and through worker RPC.
 */
export interface OrgNoteCoreApi {
  readonly files: OrgNoteFileSystemApi;
  readonly logger: OrgNoteLoggerApi;
}

/**
 * Main-thread application services available to UI extensions.
 */
export interface OrgNoteHostApi {
  /**
   * Low-level infrastructure: data repositories and WebSocket client.
   *
   * Provides direct access to persistence layer ({@link Repositories}) and
   * the real-time {@link WebSocketClient}. For most use cases prefer
   * the higher-level stores in {@link OrgNoteApi.core}.
   */
  infrastructure: Infrastructure;

  /**
   * Core application stores — the primary way extensions interact with OrgNote.
   *
   * Each property is a [Pinia](https://pinia.vuejs.org/) store factory.
   * Call it to obtain a reactive store instance:
   * ```typescript
   * const commands = api.core.useCommands();
   * const fs = api.core.useFileSystem();
   * ```
   */
  core: {
    /**
     * Register, remove, and execute commands (keyboard shortcuts, command palette actions).
     *
     * @example
     * ```typescript
     * const commands = api.core.useCommands();
     * commands.add({
     *   command: 'my-ext.greet',
     *   title: 'Greet User',
     *   handler: () => console.log('Hello!'),
     * });
     * await commands.execute('my-ext.greet');
     * ```
     */
    useCommands: CommandsStoreDefinition;

    /**
     * Manage command groups — logical collections of commands
     * displayed together in the UI (e.g. "Editor", "Navigation").
     */
    useCommandsGroup: CommandsGroupStoreDefinition;

    /**
     * Manage keyboard shortcuts: user assignments, context scope stack,
     * conflict detection, and CodeMirror keymap projection for editor commands.
     *
     * @example
     * ```ts
     * // push a context while a UI element is active
     * const stop = api.core.useKeybindings().pushContext('completion');
     * onUnmounted(stop);
     * ```
     */
    useKeybindings: KeybindingsStoreDefinition;

    /**
     * Install, enable, disable, and delete extensions at runtime.
     * Also provides the list of currently loaded extensions.
     */
    useExtensions: ExtensionStoreDefinition;

    /**
     * Spawn and communicate with background workers declared by the host.
     */
    useWorkers: WorkerStoreDefinition;

    /**
     * Virtual file system abstraction (read, write, delete, mkdir, etc.).
     * Works across platforms via [Capacitor Filesystem](https://capacitorjs.com/docs/apis/filesystem) under the hood.
     *
     * @example
     * ```typescript
     * const fs = api.core.useFileSystem();
     * const content = await fs.readFile(['notes', 'todo.org'], 'utf8');
     * await fs.writeFile(['notes', 'new.org'], '* New note');
     * ```
     */
    useFileSystem: FileSystemStoreDefinition;

    useFileWatcher: FileWatcherStoreDefinition;

    /**
     * Encrypt and decrypt text content using [OpenPGP.js](https://openpgpjs.org/).
     * Used internally for end-to-end encrypted notes.
     */
    useEncryption: EncryptionStoreDefinition;

    /**
     * Read and manage user-facing application settings.
     * Also handles API token lifecycle (create, list, revoke).
     */
    useSettings: SettingsStoreDefinition;
    useClientUpdate: ClientUpdateStoreDefinition;

    useConfig: ConfigStoreDefinition;

    /**
     * Access the [Quasar](https://quasar.dev/) framework globals ($q).
     * Useful for Quasar-specific features like `$q.dark`, `$q.screen`, etc.
     */
    useQuasar: () => QVueGlobals;

    /**
     * Open a searchable completion menu (command palette style).
     * Supports custom item lists, filtering, and keyboard navigation.
     *
     * @example
     * ```typescript
     * const completion = api.core.useCompletion();
     * const selected = await completion.open({
     *   items: ['Apple', 'Banana', 'Cherry'],
     *   itemLabel: (item) => item,
     * });
     * ```
     */
    useCompletion: CompletionStoreDefinition;

    usePane: PaneStoreDefinition;

    /**
     * Manage layout tree structure (split, merge, resize panes).
     * This is the primary coordinator for all pane-related operations.
     */
    useLayout: LayoutStoreDefinition;

    /**
     * High-level file system manager that orchestrates file operations
     * with metadata, indexing, and synchronization awareness.
     */
    useFileSystemManager: FileSystemManagerStoreDefinition;

    /**
     * File management operations: open, create, rename, delete notes
     * with full UI integration (buffer creation, navigation).
     */
    useFileManager: FileManagerStoreDefinition;

    useBufferViewer: BufferViewerStoreDefinition;

    /**
     * Show toast and persistent notifications to the user.
     *
     * @example
     * ```typescript
     * const notifications = api.core.useNotifications();
     * notifications.notify({
     *   message: 'Note saved successfully',
     *   type: 'positive',
     * });
     * ```
     */
    useNotifications: NotificationsStoreDefinition;

    /**
     * Manage open buffers (documents loaded in memory).
     * Buffers are identified by URI and support dirty-state tracking.
     */
    useBuffers: BufferStoreDefinition;

    /**
     * Register and resolve buffer content providers.
     * Providers define how different URI schemes load their content.
     */
    useBufferProviders: BufferProviderStoreDefinition;

    useSystemInfo: UseSystemInfo;
    useLog: LogStoreDefinition;

    /**
     * Background task queue with concurrency control, locking, and retry.
     * Used for long-running operations like sync and bulk file processing.
     */
    useQueue: QueueStoreDefinition;

    /**
     * Schedule recurring tasks (cron-like).
     * Tasks persist across sessions and run in the background.
     */
    useCron: CronStoreDefinition;

    useGit: GitStoreDefinition;

    /**
     * Browse and install extensions from the official OrgNote extension registry.
     */
    useExtensionRegistry: ExtensionRegistryStoreDefinition;

    /**
     * Guard files with validation rules before allowing operations.
     * Prevents accidental overwrites and enforces naming conventions.
     */
    useFileGuard: FileGuardStoreDefinition;

    useAuth: AuthStoreDefinition;

    /**
     * Bidirectional note synchronization between local storage and remote server.
     * Creates a sync plan (diff), then executes upload/download/delete operations.
     */
    useSync: SyncStoreDefinition;

    /**
     * Org-mode editor state: registered widgets, [CodeMirror](https://codemirror.net/) extensions,
     * active editor context (selection, cursor position).
     *
     * @example
     * ```typescript
     * const editor = api.core.useEditor();
     * editor.addWidgets({
     *   type: WidgetType.Inline,
     *   nodeType: 'link',
     *   id: 'my-link-widget',
     *   decorationType: 'replace',
     *   widgetBuilder: (params) => { ... },
     * });
     * ```
     */
    useEditor: EditorStoreDefinition;

    /**
     * Babel-style code transformation store.
     * Used for transpiling extension source code at runtime.
     */
    useBabel: BabelStoreDefinition;

    useFileSearch: FileSearchStoreDefinition;
    useFileMeta: FileMetaStoreDefinition;
    useEmbeddedBuffer: EmbeddedBufferStoreDefinition;
    useFileContent: UseFileContent;

    app: App;
  };

  /**
   * Utility functions available to extensions.
   *
   * Includes platform detection, CSS manipulation, clipboard access,
   * file upload dialogs, logging, TOML parsing, and URL building.
   */
  utils: {
    /**
     * Detect the current platform (mobile, desktop, electron, browser, OS).
     *
     * @example
     * ```typescript
     * if (api.utils.platform.is.mobile) {
     *   // mobile-specific logic
     * }
     * ```
     */
    platform: PlatformDetection;

    /**
     * Execute platform-specific code branches with a single call.
     *
     * @example
     * ```typescript
     * const result = await api.utils.platformMatch({
     *   mobile: () => 'compact layout',
     *   desktop: () => 'full layout',
     *   default: () => 'fallback layout',
     * });
     * ```
     */
    platformMatch: PlatformMatch;

    clientOnly: PlatformSpecificFn;
    mobileOnly: PlatformSpecificFn;
    androidOnly: PlatformSpecificFn;
    desktopOnly: PlatformSpecificFn;
    serverOnly: PlatformSpecificFn;

    getCssVar: GetCssVar;
    getCssTheme: GetCssTheme;
    getNumericCssVar: GetNumericCssVar;
    getCssProperty: GetCssProperty;
    getCssNumericProperty: GetCssNumericProperty;

    /**
     * Apply CSS custom properties to the document root.
     * Commonly used by theme extensions to override colors.
     *
     * @example
     * ```typescript
     * api.utils.applyCSSVariables({
     *   '--primary': '#ff6600',
     *   '--bg': '#1a1a2e',
     * });
     * ```
     */
    applyCSSVariables: ApplyCSSVariables<string>;

    resetCSSVariables: ResetCSSVariables<string>;

    /**
     * Inject a scoped `<style>` block identified by a unique scope name.
     * Calling again with the same scope name replaces the previous styles.
     */
    applyScopedStyles: ApplyScopedStyles;

    removeScopedStyles: RemoveScopedStyles;

    copyToClipboard: (text: string) => Promise<void>;
    uploadFiles: (params: MultipleUploadParams) => Promise<FileList>;
    uploadFile: (params?: UploadParams) => Promise<File | undefined>;

    /**
     * Structured logger scoped to the extension.
     * Messages are persisted and visible in the OrgNote log viewer.
     */
    logger: Logger;

    /**
     * Parse a [TOML](https://toml.io/) string into a JavaScript object.
     * Used for reading `.toml` configuration files.
     */
    parseToml: typeof parseToml;

    stringifyToml: typeof stringifyToml;

    /**
     * Build an OrgNote deep-link URL (for native app or web).
     *
     * @example
     * ```typescript
     * const url = api.utils.buildOrgNoteUrl('/notes/abc123', {
     *   target: 'native-app',
     * });
     * ```
     */
    buildOrgNoteUrl: BuildOrgNoteUrl;

    useAppResume: UseAppResume;
  };

  /**
   * UI-related stores for controlling visual elements: modals, sidebars,
   * themes, fonts, context menus, and screen/keyboard state.
   */
  ui: {
    useFonts: FontStoreDefinition;
    useSplashScreen: UseSplashScreen;
    useBackgroundSettings: UseBackgroundSettings;
    useSidebar: SidebarStoreDefinition;
    useRightSidebar: RightSidebarStoreDefinition;
    usePinnedCommands: PinnedCommandsStoreDefinition;

    /**
     * Open modal dialogs with custom Vue components.
     *
     * @example
     * ```typescript
     * const modal = api.ui.useModal();
     * const result = await modal.open(MyDialogComponent, {
     *   title: 'Confirm action',
     * });
     * ```
     */
    useModal: ModalStoreDefinition;

    useSettingsUi: SettingsUiStoreDefinition;

    /**
     * Show a confirmation dialog and await the user's response.
     *
     * @example
     * ```typescript
     * const { confirm } = api.ui.useConfirmationModal();
     * const confirmed = await confirm({
     *   title: 'Delete note?',
     *   message: 'This action cannot be undone.',
     * });
     * if (confirmed) { ... }
     * ```
     */
    useConfirmationModal: UseConfirmationModal;

    useScreenDetection: UseScreenDetection;
    useKeyboardState: UseKeyboardState;
    useContextMenu: ContextMenuStoreDefinition;

    /**
     * Manage the active color theme.
     * Theme extensions use this store to register and activate their themes.
     */
    useTheme: ThemeStoreDefinition;
  };

  /**
   * Direct access to the Vue ecosystem.
   */
  vue: {
    /**
     * The [Vue Router](https://router.vuejs.org/) instance.
     * Use for programmatic navigation within the OrgNote application.
     *
     * @example
     * ```typescript
     * api.vue.router.push({ name: 'note', params: { id: 'abc123' } });
     * ```
     */
    router: Router;
    defineComponent: typeof defineComponent;
    h: typeof h;
    ref: typeof ref;
    watch: typeof watch;
    onMounted: typeof onMounted;
    onBeforeUnmount: typeof onBeforeUnmount;
  };
}

/**
 * Complete API facade provided to every OrgNote extension lifecycle hook.
 */
export interface OrgNoteApi extends OrgNoteCoreApi, OrgNoteHostApi {
  [key: string]: unknown;
}
