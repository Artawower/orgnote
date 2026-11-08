import {
  array,
  boolean,
  InferOutput,
  number,
  object,
  optional,
  string,
} from 'valibot';

export const SyncProfileSchema = object({
  name: string(),
  clientAddress: optional(string(), ''),
  remoteAddress: string(),
  wsAddress: optional(string(), ''),
  token: optional(string(), ''),
  rootFolder: optional(string(), ''),
  logPath: optional(string(), '/tmp/log/orgnote'),
  debug: optional(boolean(), false),
  backupDir: optional(string(), ''),
  backupCount: optional(number(), 3),
  ignorePatterns: optional(array(string()), []),
});

export const SyncProfileConfigSchema = object({
  accounts: optional(array(SyncProfileSchema), []),
  root: optional(array(SyncProfileSchema), []),
});

export type SyncProfile = InferOutput<typeof SyncProfileSchema>;
export type SyncProfileConfig = InferOutput<typeof SyncProfileConfigSchema>;
