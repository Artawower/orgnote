import type { BaseSchema, BaseIssue } from 'valibot';
import { OrgNoteApi } from '../api';
import { EXTENSION_ASSETS_SCHEMA } from './extension-assets';
import { EXTENSION_WORKERS_SCHEMA } from './extension-worker';

import {
  object,
  string,
  union,
  optional,
  array,
  boolean,
  record,
  unknown,
  literal,
  check,
  pipe,
  type InferOutput,
} from 'valibot';

const PLATFORM_SCHEMA = union([
  literal('mobile'),
  literal('desktop'),
  literal('capacitor'),
  literal('nativeMobile'),
  literal('electron'),
  literal('linux'),
  literal('mac'),
  literal('win'),
  literal('chrome'),
  literal('firefox'),
  literal('opera'),
  literal('safari'),
  literal('webkit'),
  literal('ios'),
  literal('ipad'),
  literal('iphone'),
  literal('ipod'),
  literal('winphone'),
  literal('blackberry'),
]);

const PERMISSION_SCHEMA = union([
  literal('files'),
  literal('personal info'),
  literal('*'),
  literal('third party'),
]);

const CATEGORY_SCHEMA = union([
  literal('theme'),
  literal('extension'),
  literal('language pack'),
  literal('other'),
]);

const GIT_SOURCE_SCHEMA = object({
  type: literal('git'),
  repo: string(),
  branch: optional(string()),
  tag: optional(string()),
});

const LOCAL_SOURCE_SCHEMA = object({
  type: literal('local'),
});

const BUILTIN_SOURCE_SCHEMA = object({
  type: literal('builtin'),
});

const SOURCE_SCHEMA = union([
  GIT_SOURCE_SCHEMA,
  LOCAL_SOURCE_SCHEMA,
  BUILTIN_SOURCE_SCHEMA,
]);

const COMMAND_SCHEMA = object({
  id: string(),
  title: string(),
  category: optional(string()),
});

const KEYBINDING_SCHEMA = object({
  key: string(),
  command: string(),
  when: optional(string()),
});

const ACTIVATION_EVENT_SCHEMA = union([literal('onStartup'), literal('*')]);

const JSON_SCHEMA_PROPERTY_SCHEMA = object({
  type: string(),
  description: optional(string()),
  default: optional(unknown()),
});

const CONFIG_SCHEMA_SCHEMA = object({
  type: literal('object'),
  properties: record(string(), JSON_SCHEMA_PROPERTY_SCHEMA),
});

const EXTENSION_MANIFEST_BASE_SCHEMA = object({
  name: string(),
  version: string(),
  category: CATEGORY_SCHEMA,
  source: SOURCE_SCHEMA,

  author: optional(string()),
  description: optional(string()),
  keywords: optional(array(string())),
  icon: optional(string()),
  platforms: optional(array(PLATFORM_SCHEMA)),
  permissions: optional(array(PERMISSION_SCHEMA)),

  apiVersion: optional(string()),
  minOrgNoteVersion: optional(string()),

  license: optional(string()),
  sponsor: optional(array(string())),

  readmeFilePath: optional(string()),

  reloadRequired: optional(boolean()),
  development: optional(boolean()),

  commands: optional(array(COMMAND_SCHEMA)),
  keybindings: optional(array(KEYBINDING_SCHEMA)),

  activationEvents: optional(array(ACTIVATION_EVENT_SCHEMA)),

  dependencies: optional(record(string(), string())),
  assets: optional(EXTENSION_ASSETS_SCHEMA),
  workers: optional(EXTENSION_WORKERS_SCHEMA),

  configSchema: optional(CONFIG_SCHEMA_SCHEMA),
});

const WORKER_MEDIA_TYPES = new Set(['text/javascript', 'application/javascript']);

type ExtensionManifestOutput = InferOutput<typeof EXTENSION_MANIFEST_BASE_SCHEMA>;

const hasDeclaredWorkerAssets = (manifest: ExtensionManifestOutput): boolean =>
  (manifest.workers ?? []).every((worker) =>
    manifest.assets?.some(
      (asset) => asset.path === worker.path && WORKER_MEDIA_TYPES.has(asset.mediaType),
    ),
  );

export const EXTENSION_MANIFEST_SCHEMA = pipe(
  EXTENSION_MANIFEST_BASE_SCHEMA,
  check(hasDeclaredWorkerAssets),
);

export type ExtensionManifest = InferOutput<typeof EXTENSION_MANIFEST_SCHEMA>;
export type ExtensionCategory = InferOutput<typeof CATEGORY_SCHEMA>;
export type ExtensionSourceInfo = InferOutput<typeof SOURCE_SCHEMA>;
export type GitSource = InferOutput<typeof GIT_SOURCE_SCHEMA>;
export type LocalSource = InferOutput<typeof LOCAL_SOURCE_SCHEMA>;
export type BuiltinSource = InferOutput<typeof BUILTIN_SOURCE_SCHEMA>;
export type ExtensionCommand = InferOutput<typeof COMMAND_SCHEMA>;
export type ExtensionKeybinding = InferOutput<typeof KEYBINDING_SCHEMA>;
export type ExtensionPlatform = InferOutput<typeof PLATFORM_SCHEMA>;
export type ExtensionPermission = InferOutput<typeof PERMISSION_SCHEMA>;

export interface Extension {
  [key: string]: unknown;

  onMounted: (api: OrgNoteApi) => Promise<void> | void;
  onUnmounted?: (api: OrgNoteApi) => Promise<void> | void;
  settingsSchema?: BaseSchema<
    Record<string, unknown>,
    Record<string, unknown>,
    BaseIssue<unknown>
  >;
  defaultSettings?: Record<string, unknown>;
}

export interface ExtensionMeta {
  manifest: ExtensionManifest;
  uploaded?: boolean;
  active?: boolean;
  config?: Record<string, unknown>;
}

export interface ExtensionSource {
  name: string;
  version: string;
  source: string;
  module: string;
  docFiles: string[];
}
