import clone from 'rfdc';
import equal from 'fast-deep-equal';
import { err, ok, type Result } from 'neverthrow';
import type { OrgNoteConfig } from 'orgnote-api';
import {
  InvalidOrgNoteConfigSchemaError,
  parseOrgNoteConfigToml,
} from 'src/utils/parse-orgnote-config-toml';

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  Boolean(val && typeof val === 'object' && !Array.isArray(val));

const mergeField = <T extends Record<string, unknown>>(
  result: T,
  key: keyof T,
  baseVal: unknown,
  currVal: unknown,
): void => {
  if (isPlainObject(currVal) && isPlainObject(baseVal)) {
    const targetObj = (result[key] ?? {}) as Record<string, unknown>;
    result[key] = mergeUserOverrides(targetObj, baseVal, currVal) as T[keyof T];
    return;
  }
  result[key] = clone()(currVal) as T[keyof T];
};

export const mergeUserOverrides = <T extends Record<string, unknown>>(
  target: T,
  baseline: T | undefined,
  current: T,
): T => {
  const result = clone()(target);
  const base = baseline ?? ({} as T);
  for (const key of Object.keys(current) as (keyof T)[]) {
    if (equal(current[key], base[key])) continue;
    mergeField(result, key, base[key], current[key]);
  }
  return result;
};

export interface AppliedDiskConfig {
  readonly finalConfig: OrgNoteConfig;
  readonly validated: OrgNoteConfig;
}

export const applyDiskConfig = (
  rawConfigContent: string,
  config: OrgNoteConfig,
  baselineConfig: OrgNoteConfig | undefined,
  hasPendingMutation: boolean,
): Result<AppliedDiskConfig, { cause: Error; errors: string[] }> => {
  const parsed = parseOrgNoteConfigToml(rawConfigContent);

  if (parsed.isErr()) {
    const cause = parsed.error;
    const errors = cause instanceof InvalidOrgNoteConfigSchemaError ? [...cause.errors] : [];
    return err({ cause, errors });
  }

  const validated = parsed.value;
  if (!hasPendingMutation || !baselineConfig) {
    return ok({ finalConfig: validated, validated });
  }

  const finalConfig = mergeUserOverrides(
    { ...validated },
    { ...baselineConfig },
    { ...config },
  );
  return ok({ finalConfig, validated });
};
