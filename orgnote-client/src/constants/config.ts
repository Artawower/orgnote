import { stringifyToml } from 'orgnote-api/utils';
import type { LogLevel, OrgNoteConfig } from 'orgnote-api';
import { DEFAULT_FONT_FAMILIES } from './fonts';
import { DEFAULT_GRAPH_CONFIG } from './graph-defaults';

export const DEFAULT_MIN_NOTIFICATION_LEVEL: LogLevel = process.env.DEV ? 'info' : 'error';

export const DEFAULT_PANE_PERSISTENCE_SAVE_DELAY = 500;
export const DEFAULT_TOOLTIP_DELAY = 300;
export const DEFAULT_NOTIFICATION_THROTTLE_MS = 5 * 60 * 1000;

export const DEFAULT_FUST_THRESHOLD = 0.4;

export const DEFAULT_SAVE_DELAY_MS = 500;
export const DEFAULT_VALIDATION_DELAY_MS = 1000;

export const DEFAULT_CONFIG: OrgNoteConfig = {
  editor: {
    showSpecialSymbols: false,
    showPropertyDrawer: true,
    saveDelayMs: DEFAULT_SAVE_DELAY_MS,
    validationDelayMs: DEFAULT_VALIDATION_DELAY_MS,
    autoCreateMissingNotes: true,
  },
  developer: {
    developerMode: Boolean(process.env.DEV),
    maximumLogsCount: 1000,
    storeQueueTasksMinutes: 60,
    corsProxy: 'https://org-note.com/cors/',
  },
  system: {
    language: 'en-US',
  },
  network: {
    apiUrl: process.env.API_URL || '/v1',
    wsUrl: process.env.WS_URL || '',
  },
  completion: {
    showGroup: false,
    defaultCompletionLimit: 20,
    fuseThreshold: DEFAULT_FUST_THRESHOLD,
    showDetails: true,
  },
  synchronization: {
    type: 'none',
  },
  ui: {
    showUserProfiles: true,
    theme: 'auto',
    darkThemeName: null,
    showFileTitleBar: true,
    lightThemeName: null,
    enableAnimations: true,
    notificationTimeout: 5000,
    notificationThrottleMs: DEFAULT_NOTIFICATION_THROTTLE_MS,
    tooltipDelay: DEFAULT_TOOLTIP_DELAY,
    minNotificationLevel: DEFAULT_MIN_NOTIFICATION_LEVEL,
    persistantPanes: true,
    persistantPanesSaveDelay: DEFAULT_PANE_PERSISTENCE_SAVE_DELAY,
    followActiveBufferInSidebar: false,
    reuseExistingBuffers: false,
    dropZoneEdgeRatio: 0.25,
    graph: {
      ...DEFAULT_GRAPH_CONFIG,
    },
    fonts: { ...DEFAULT_FONT_FAMILIES },
  },
  extensions: {
    sources: ['https://github.com/Artawower/orgnote-extensions'],
  },
  encryption: {
    type: 'disabled',
  },
  fileReaders: {
    preferredReaders: {},
  },
};

export const DEFAULT_CONFIG_CONTENT = stringifyToml(DEFAULT_CONFIG);
