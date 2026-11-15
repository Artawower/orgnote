/*
 * This are default commands. It's not a complete list
 * Some of the commands are dynamically generated or
 * can be added by user extensions.
 */
export enum DefaultCommands {
  // Global commands
  REPORT_BUG = 'report bug',
  OPEN_SYSTEM_INFO = 'open system info',
  SHOW_LATEST_CHANGES = 'show latest changes',
  CHECK_FOR_UPDATES = 'check for updates',
  SHOW_LOGS = 'show logs',
  APPLY_PWA_UPDATE = 'apply pwa update',
  CLEAR_LOGS = 'clear logs',
  TOGGLE_SIDEBAR = 'toggle sidebar',
  CLOSE_SIDEBAR = 'close sidebar',
  OPEN_SIDEBAR = 'open sidebar',
  TOGGLE_FILE_MANAGER = 'toggle file manager',
  CREATE_NOTE = 'create note',
  PROJECT_INFO = 'project info',

  // Right panel
  TOGGLE_RIGHT_SIDEBAR = 'toggle right sidebar',
  OPEN_RIGHT_SIDEBAR = 'open right sidebar',
  CLOSE_RIGHT_SIDEBAR = 'close right sidebar',
  OPEN_BACKLINKS = 'open backlinks',
  OPEN_OUTLINE = 'open outline',
  OPEN_LOCAL_GRAPH = 'open local graph',
  LOCAL_GRAPH = 'local graph',
  TOGGLE_AST_DEBUGGER = 'toggle ast debugger',

  // Completion commands
  SEARCH = 'search',
  TOGGLE_COMMANDS = 'toggle commands',
  RESTORE_COMPLETION = 'restore last completion',
  EXIT_COMMAND_EXECUTOR = 'exit command executor',
  NEXT_CANDIDATE = 'next candidate',
  PREV_CANDIDATE = 'previous candidate',
  ACCEPT_COMPLETION_AUTOCOMPLETE = 'accept completion autocomplete',
  EXECUTE_CANDIDATE = 'execute candidate',

  // Settings
  SETTINGS = 'settings',
  RESET_THEME = 'reset theme',
  SELECT_THEME_MODE = 'select theme mode',
  TOGGLE_DEBUG_MODE = 'toggle debug mode',
  SELECT_THEME = 'select theme',
  SYSTEM_SETTINGS = 'system settings',
  LANGUAGE_SETTINGS = 'language settings',
  INTERFACE_SETTINGS = 'interface settings',
  SYNCHRONISATION_SETTINGS = 'synchronisation settings',
  SUBSCRIPTION_SETTINGS = 'subscription settings',
  KEYBINDINGS_SETTINGS = 'keybindings settings',
  DEVELOPER_SETTINGS = 'developer settings',
  EXTENSIONS_SETTINGS = 'extensions',
  ENCRYPTION_SETTINGS = 'encryption settings',
  API_SETTINGS = 'api settings',
  AUTHENTICATION_SETTINGS = 'authentication settings',
  SOURCE_CODE = 'show source code',
  READ_WIKI = 'read wiki',
  SPONSOR = 'sponsor',
  DELETE_ALL_DATA = 'delete all data',
  RESET_SYSTEM = 'Reset system',
  DELETE_ALL_NOTES = 'delete all notes',
  DELETE_ACCOUNT = 'delete account',
  STORAGE_SETTINGS = 'storage settings',

  // Routing
  OPEN_MY_NOTES = 'my notes',
  OPEN_DASHBOARD = 'dashboard',
  OPEN_PUBLIC_NOTE_LIST = 'public note list',
  OPEN_NOTE_EDITOR = 'edit mode',
  OPEN_NOTE_VIEWER = 'view mode',
  OPEN_GRAPH = 'graph',
  GRAPH_SETTINGS = 'graph settings',
  OPEN_GRAPH_SETTINGS = 'open graph settings',

  // Native mobile specific
  SELECT_FILE_PATH = 'select file path',
  PICK_SYNC_DIR = 'pick sync dir',

  // File management
  SYNC_FILES = 'sync files',
  EXPORT_LOCAL_SYNC_CONFIG = 'copy CLI sync config',
  DOWNLOAD_LOCAL_SYNC_CONFIG = 'download CLI sync config',
  COPY_EMACS_USE_PACKAGE_CONFIG = 'copy Emacs use-package config',
  COPY_CLI_INSTALL_COMMAND = 'copy CLI install command',
  RELOAD_FILES = 'reload files',
  ENCRYPT_NOTE = 'encrypt note',
  DECRYPT_NOTE = 'decrypt note',

  // Encryption key management
  UPLOAD_PRIVATE_KEY = 'upload private key',
  UPLOAD_PUBLIC_KEY = 'upload public key',
  GENERATE_GPG_KEYS = 'generate gpg keys',

  // File manager
  MAXIMIZE_FILE_MANAGER = 'maximize file manager',
  CREATE_FOLDER = 'create folder',
  CREATE_FILE = 'create file',
  RENAME_FILE = 'rename file',
  DELETE_FILE = 'delete file',
  COPY_FILE = 'copy file',
  MOVE_FILE = 'move file',
  SELECT_FILE = 'select file',
  SELECT_ALL_FILES = 'select all files',
  DESELECT_ALL_FILES = 'deselect all files',
  EXECUTE_PENDING_FILE_OPERATION = 'paste files here',
  CANCEL_PENDING_FILE_OPERATION = 'cancel file operation',
  SORT_FILES = 'sort files',
  CONFIRM_FILE_DELETION = 'are you sure you want to delete file?',
  NEW_FILE_PATH = 'new file path',
  SHOW_MOBILE_FILE_SEARCH = 'show mobile file search',
  HIDE_MOBILE_FILE_SEARCH = 'hide mobile file search',
  REVEAL_IN_FILE_MANAGER = 'reveal in file manager',

  // Notes commands
  OPEN_NOTE = 'open note',
  SHOW_FILE_INFO = 'show file info',
  OPEN_FILE_ACTIONS = 'open file actions',
  COPY_BUFFER_CONTENT = 'copy buffer content',
  CLEAR_NOTE = 'clear note',

  // Link actions
  COPY_LINK = 'copy link',
  OPEN_LINK_IN_NEW_TAB = 'open link in new tab',
  OPEN_LINK_IN_ADJACENT_PANE = 'open link in adjacent pane',

  // Windows & buffers
  TABS = 'show tabs',
  SHOW_TAB_SWITCHER = 'show tab switcher',
  CLOSE_TAB = 'close tab',
  NEW_TAB = 'new tab',
  SELECT_TAB_BY_NUMBER = 'select tab by number',
  SHOW_OR_OPEN_BUFFER = 'show or open buffer',

  // Pane resize
  RESIZE_PANE_LEFT = 'resize pane left',
  RESIZE_PANE_RIGHT = 'resize pane right',
  RESIZE_PANE_UP = 'resize pane up',
  RESIZE_PANE_DOWN = 'resize pane down',

  // Modal
  CLOSE_MODAL = 'close modal',

  // Developer settings
  OPEN_QUEUE_MANAGER = 'open queue manager',
  RESTART_QUEUE = 'restart queue',
  STOP_QUEUE = 'stop queue',
  CLEAR_QUEUE = 'clear queue',
  OPEN_CRON = 'open cron manager',
  CLEAR_OLD_QUEUE_TASKS = 'clear old queue tasks',
  COPY_COMMAND_URL = 'copy command url',
  SHOW_PERFORMANCE_REPORT = 'show performance report',
  CLEAR_PERFORMANCE_REPORT = 'clear performance report',

  // Extensions
  IMPORT_EXTENSION = 'import extension',
  OPEN_EXTENSIONS_MANAGER = 'open extensions manager',
  OPEN_EXTENSION_SETTINGS = 'extension settings',
  TOGGLE_EXTENSIONS = 'toggle extensions',

  // Notifications
  OPEN_NOTIFICATIONS = 'open notifications',

  // Auth
  LOGIN = 'login',
  LOGOUT = 'logout',
  REMOVE_ACCOUNT = 'remove account',

  // Search
  INIT_SEARCH_INDEX = 'init search index',

  // Editor commands
  EDITOR_UNDO = 'undo',
  EDITOR_REDO = 'redo',
  EDITOR_INSERT_HEADLINE = 'insert headline',
  EDITOR_INSERT_CODE_BLOCK = 'insert code block',
  EDITOR_INSERT_QUOTE = 'insert quote',
  EDITOR_INSERT_LATEX = 'insert latex block',
  EDITOR_INSERT_LINK = 'insert link',
  EDITOR_INSERT_INTERNAL_LINK = 'insert internal link',
  EDITOR_INSERT_IMAGE = 'insert image',
  EDITOR_INSERT_BOLD = 'insert bold',
  EDITOR_INSERT_ITALIC = 'insert italic',
  EDITOR_INSERT_STRIKETHROUGH = 'insert strikethrough',
  EDITOR_INSERT_INLINE_CODE = 'insert inline code',
  EDITOR_INSERT_BULLET_LIST = 'insert bullet list',
  EDITOR_INSERT_NUMERIC_LIST = 'insert numeric list',
  EDITOR_INSERT_CHECK_LIST = 'insert check list',
  EDITOR_INSERT_HORIZONTAL_RULE = 'insert horizontal rule',
  EDITOR_INSERT_HTML_BLOCK = 'insert html block',
  EDITOR_INSERT_TABLE = 'insert table',
  EDITOR_INSERT_TAG = 'insert tag',
  EDITOR_INSERT_DATETIME = 'insert datetime',
  EDITOR_ADD_PROPERTY = 'add property',
  EDITOR_ADD_PAGE_PROPERTY = 'add page property',
  EDITOR_ADD_HEADLINE_PROPERTY = 'add headline property',
  EDITOR_CARET_UP = 'caret up',
  EDITOR_CARET_DOWN = 'caret down',
  EDITOR_HIDE_KEYBOARD = 'hide keyboard',

  // History navigation
  HISTORY_BACK = 'history back',
  HISTORY_FORWARD = 'history forward',

  // File search
  OPEN_FILE_SEARCH = 'open file search',

  // External commands
  PREVIEW_NOTE = 'preview note',
  SHARE_NOTE_ONETIME = 'share current note one time',
}
