// NOTE It's not a real scheme, just a simple representation of actual scheme
// with necessary fields for rendering.
import type { CommandName } from 'orgnote-api';

// TODO: find a batter way to get fields from the orgnote-api scheme
export interface ValibotMetadata {
  metadata: {
    conditionalKey?: string;
    textarea?: boolean;
    upload?: boolean;
    password?: boolean;
    command?: CommandName;
    directoryPicker?: boolean;
    filePicker?: boolean;
    rootPath?: string;
    allowedExtensions?: string[];
    ensureRootPath?: boolean;
    createIfMissing?: boolean;
    recursive?: boolean;
    defaultValue?: string;
  };
  type: string;
}

export interface ValibotScheme {
  type: string;
  options?: ValibotScheme[];
  pipe?: ValibotMetadata[];
  entries?: { [key: string]: ValibotScheme };
  literal?: string;
  wrapped?: ValibotScheme;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function valibotScheme(t: any): ValibotScheme {
  return t as unknown as ValibotScheme;
}

interface SchemeWithEntries<TEntries extends Record<string, unknown>> {
  entries: TEntries;
}

export function pickSchemeKeys<TEntries extends Record<string, unknown>>(
  scheme: SchemeWithEntries<TEntries>,
  keys: (keyof TEntries)[],
): ValibotScheme {
  const keySet = new Set<string>(keys as string[]);
  const entries = Object.fromEntries(
    Object.entries(scheme.entries).filter(([key]) => keySet.has(key)),
  );
  return valibotScheme({ ...scheme, entries });
}

export function omitSchemeKeys<TEntries extends Record<string, unknown>>(
  scheme: SchemeWithEntries<TEntries>,
  keys: (keyof TEntries)[],
): ValibotScheme {
  const keySet = new Set<string>(keys as string[]);
  const entries = Object.fromEntries(
    Object.entries(scheme.entries).filter(([key]) => !keySet.has(key)),
  );
  return valibotScheme({ ...scheme, entries });
}
