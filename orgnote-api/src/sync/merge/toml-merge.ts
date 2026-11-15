import { parseToml, stringifyToml } from '../../utils/toml';
import { textToUint8Array, uint8ArrayToText } from '../../utils/binary';
import { to } from '../../utils/to-error';
import type { MergeInputs, MergeResult } from '../types';
import { MergeOutcome } from '../types';

const MISSING = Symbol('missing');
type Missing = typeof MISSING;
type MergeValue = unknown | Missing;
type TomlRecord = Record<string, unknown>;

interface ValueMergeResult {
  value: MergeValue;
  hasConflict: boolean;
}

const isRecord = (value: MergeValue): value is TomlRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

const isEqual = (left: MergeValue, right: MergeValue): boolean => {
  if (Object.is(left, right)) return true;
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => isEqual(value, right[index]));
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => isEqual(left[key], right[key]));
};

const mergeRecords = (
  base: TomlRecord,
  local: TomlRecord,
  remote: TomlRecord
): ValueMergeResult => {
  const keys = [...new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])];
  return keys.reduce<ValueMergeResult>((result, key) => {
    const merged = mergeValue(base[key] ?? MISSING, local[key] ?? MISSING, remote[key] ?? MISSING);
    const value = merged.value === MISSING ? result.value : { ...(result.value as TomlRecord), [key]: merged.value };
    return { value, hasConflict: result.hasConflict || merged.hasConflict };
  }, { value: {}, hasConflict: false });
};

const mergeValue = (
  base: MergeValue,
  local: MergeValue,
  remote: MergeValue
): ValueMergeResult => {
  if (isEqual(local, remote)) return { value: local, hasConflict: false };
  if (isEqual(base, local)) return { value: remote, hasConflict: false };
  if (isEqual(base, remote)) return { value: local, hasConflict: false };
  if (isRecord(local) && isRecord(remote) && (isRecord(base) || base === MISSING)) {
    return mergeRecords(base === MISSING ? {} : base, local, remote);
  }
  return { value: local, hasConflict: true };
};

const parseRecord = (content: Uint8Array): TomlRecord => {
  const parsed = parseToml(uint8ArrayToText(content));
  if (!isRecord(parsed)) throw new TypeError('Expected a TOML table');
  return parsed;
};

const parseContent = (content: Uint8Array) =>
  to<TomlRecord>(() => parseRecord(content))();

export const mergeToml = (inputs: MergeInputs): MergeResult => {
  const base = parseContent(inputs.base);
  const local = parseContent(inputs.local);
  const remote = parseContent(inputs.remote);
  if (base.isErr() || local.isErr() || remote.isErr()) return { outcome: MergeOutcome.Ambiguous };

  const merged = mergeRecords(base.value, local.value, remote.value);
  if (merged.hasConflict) return { outcome: MergeOutcome.Ambiguous };

  const serialized = to(() => stringifyToml(merged.value))();
  if (serialized.isErr()) return { outcome: MergeOutcome.Ambiguous };

  return {
    outcome: MergeOutcome.Merged,
    mergedContent: textToUint8Array(serialized.value),
  };
};
