import {
  array,
  check,
  minLength,
  object,
  optional,
  pipe,
  regex,
  string,
  union,
  literal,
  type InferOutput,
} from 'valibot';

const WORKER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

export const EXTENSION_WORKER_CAPABILITY_SCHEMA = union([
  literal('files:read'),
  literal('files:write'),
]);

export const EXTENSION_WORKER_SCHEMA = object({
  id: pipe(string(), minLength(1), regex(WORKER_ID_PATTERN)),
  path: pipe(string(), minLength(1)),
  capabilities: optional(array(EXTENSION_WORKER_CAPABILITY_SCHEMA)),
});

export type ExtensionWorkerCapability = InferOutput<
  typeof EXTENSION_WORKER_CAPABILITY_SCHEMA
>;
export type ExtensionWorkerDescriptor = InferOutput<typeof EXTENSION_WORKER_SCHEMA>;

const hasUniqueWorkerIds = (workers: ExtensionWorkerDescriptor[]): boolean =>
  new Set(workers.map((worker) => worker.id)).size === workers.length;

export const EXTENSION_WORKERS_SCHEMA = pipe(
  array(EXTENSION_WORKER_SCHEMA),
  check(hasUniqueWorkerIds),
);
