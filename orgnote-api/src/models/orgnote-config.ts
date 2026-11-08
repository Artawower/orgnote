import {
  object,
  boolean,
  number,
  string,
  union,
  optional,
  array,
  literal,
  InferOutput,
  pipe,
  unknown,
  objectWithRest,
} from 'valibot';
import { OrgNoteEncryptionSchema } from './encryption';
import { LOG_LEVEL_SCHEMA } from './log';
import { KEYBINDINGS_CONFIG_SCHEMA } from './keybinding-schemas';

export const ORG_NOTE_CONFIG_SCHEMA = pipe(
  objectWithRest(
    {
      editor: object({
        showSpecialSymbols: boolean(),
        showPropertyDrawer: boolean(),
        saveDelayMs: optional(number()),
        validationDelayMs: optional(number()),
        autoCreateMissingNotes: optional(boolean()),
      }),
      developer: object({
        developerMode: boolean(),
        maximumLogsCount: number(),
        storeQueueTasksMinutes: number(),
        corsProxy: string(),
      }),
      completion: object({
        showGroup: boolean(),
        defaultCompletionLimit: number(),
        fuseThreshold: optional(number()),
        showDetails: optional(boolean()),
      }),
      system: object({
        language: string(),
      }),
      network: object({
        apiUrl: optional(string()),
        wsUrl: optional(string()),
      }),
      synchronization: object({
        type: union([literal('none'), literal('api')]),
      }),
      ui: object({
        showUserProfiles: boolean(),
        theme: union([literal('light'), literal('dark'), literal('auto')]),
        darkThemeName: optional(union([string(), literal(null)])),
        lightThemeName: optional(union([string(), literal(null)])),
        enableAnimations: boolean(),
        notificationTimeout: optional(number()),
        notificationThrottleMs: optional(number()),
        tooltipDelay: optional(number()),
        minNotificationLevel: optional(LOG_LEVEL_SCHEMA),
        persistantPanes: optional(boolean()),
        persistantPanesSaveDelay: number(),
        followActiveBufferInSidebar: optional(boolean()),
        reuseExistingBuffers: optional(boolean()),
        showFileTitleBar: boolean(),
        dropZoneEdgeRatio: number(),
        graph: object({
          nodeRelSize: optional(number()),
          linkDistance: optional(number()),
          chargeStrength: optional(number()),
          warmupTicks: optional(number()),
          velocityDecay: optional(number()),
          initialZoom: optional(number()),
          labelFontSize: optional(number()),
          linkWidth: optional(number()),
        }),
        fonts: optional(
          object({
            main: optional(string()),
            editor: optional(string()),
            headline: optional(string()),
            code: optional(string()),
          })
        ),
      }),
      fileReaders: optional(
        object({
          preferredReaders: optional(
            objectWithRest({}, string())
          ),
        })
      ),
      extensions: object({
        sources: array(string()),
      }),
      encryption: OrgNoteEncryptionSchema,
      keybindings: optional(KEYBINDINGS_CONFIG_SCHEMA),
    },
    unknown()
  )
);

/* Settings are stored in memory */
export interface DefinedOrgNoteSettings {
  vault?: string;
}

export type OrgNoteSettings = DefinedOrgNoteSettings & {
  [key: string]: unknown;
};

export type GraphUiConfig = Required<NonNullable<InferOutput<typeof ORG_NOTE_CONFIG_SCHEMA>['ui']['graph']>>;

export type OrgNoteConfig = InferOutput<typeof ORG_NOTE_CONFIG_SCHEMA> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};
